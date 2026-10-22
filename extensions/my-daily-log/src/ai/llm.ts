import { getPreferenceValues } from "@raycast/api";

// The AI features talk to any OpenAI-compatible chat completions API instead of Raycast AI.
// This works with local models (Ollama, LM Studio, llama.cpp, LocalAI, Jan…) and with hosted providers.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type AIConfig = {
  baseUrl: string;
  model: string;
  apiKey?: string;
  instructions?: string;
  /** `default` leaves the model's behaviour, anything else is sent as `reasoning_effort` (`none` disables thinking). */
  thinking?: string;
  /** Extra request parameters, as JSON or `--key=value` flags. */
  extraParams?: string;
};

export const DEFAULT_AI_BASE_URL = "http://localhost:11434/v1";
export const DEFAULT_AI_MODEL = "llama3.2";

export function getAIConfig(): AIConfig {
  const preferences = getPreferenceValues<Preferences>();
  return {
    baseUrl: (preferences.aiBaseUrl?.trim() || DEFAULT_AI_BASE_URL).replace(/\/+$/, ""),
    model: preferences.aiModel?.trim() || DEFAULT_AI_MODEL,
    apiKey: preferences.aiApiKey?.trim() || undefined,
    instructions: preferences.aiInstructions?.trim() || undefined,
    thinking: preferences.aiThinking || undefined,
    extraParams: preferences.aiExtraParams?.trim() || undefined,
  };
}

function parseValue(value: string): unknown {
  if (value === "true" || value === "false" || value === "null" || /^-?\d+(\.\d+)?$/.test(value)) {
    return JSON.parse(value);
  }
  if (/^[[{"]/.test(value)) {
    try {
      return JSON.parse(value);
    } catch {
      // Not JSON, keep it as a string.
    }
  }
  return value.replace(/^'(.*)'$/, "$1");
}

/**
 * Parses the "Extra Model Parameters" preference. Accepts a JSON object (`{"temperature": 0.2}`)
 * or command line style flags (`--think=false --temperature 0.2`, `top_p=0.9`).
 */
export function parseExtraParams(input: string | undefined): Record<string, unknown> {
  const value = input?.trim();
  if (!value) {
    return {};
  }
  if (value.startsWith("{") || value.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new AIError(
        `The "Extra Model Parameters" preference is not valid JSON (${error instanceof Error ? error.message : error}).`,
      );
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new AIError(`The "Extra Model Parameters" preference must be a JSON object, e.g. {"temperature": 0.2}.`);
    }
    return parsed as Record<string, unknown>;
  }

  const params: Record<string, unknown> = {};
  const tokens = value.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index].replace(/^-+/, "");
    const separator = token.indexOf("=");
    if (separator > 0) {
      params[token.slice(0, separator).replace(/-/g, "_")] = parseValue(token.slice(separator + 1));
    } else if (tokens[index + 1] !== undefined && !tokens[index + 1].startsWith("-")) {
      params[token.replace(/-/g, "_")] = parseValue(tokens[++index]);
    } else if (token.length > 0) {
      params[token.replace(/-/g, "_")] = true;
    }
  }
  return params;
}

/** Builds the body of the chat completions request. */
export function buildRequestBody(messages: ChatMessage[], config: AIConfig): Record<string, unknown> {
  const extra = parseExtraParams(config.extraParams);

  // `think` is how Ollama calls it (`ollama run --think=false`), but its OpenAI-compatible API
  // (like OpenAI and others) expects `reasoning_effort`, where "none" disables thinking.
  if ("think" in extra) {
    const think = extra.think;
    delete extra.think;
    if (!("reasoning_effort" in extra) && !("reasoning" in extra)) {
      if (think === false || think === "false" || think === "none") {
        extra.reasoning_effort = "none";
      } else if (typeof think === "string" && think !== "true") {
        extra.reasoning_effort = think;
      }
    }
  }

  const thinking = config.thinking && config.thinking !== "default" ? { reasoning_effort: config.thinking } : {};
  return { model: config.model, ...thinking, ...extra, messages, stream: true };
}

export class AIError extends Error {}

type CompletionChunk = {
  choices?: { delta?: { content?: string | null }; message?: { content?: string | null } }[];
  error?: { message?: string } | string;
};

function isLocalServer(baseUrl: string): boolean {
  return /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/.test(baseUrl);
}

function isOllama(baseUrl: string): boolean {
  return baseUrl.includes(":11434");
}

async function describeHttpError(response: Response, config: AIConfig): Promise<string> {
  const body = await response.text().catch(() => "");
  let message = body;
  try {
    const parsed = JSON.parse(body) as CompletionChunk;
    message = typeof parsed.error === "string" ? parsed.error : (parsed.error?.message ?? body);
  } catch {
    // Not JSON, keep the raw body.
  }
  if (response.status === 404 && isOllama(config.baseUrl)) {
    return `The model "${config.model}" was not found. Download it with \`ollama pull ${config.model}\` or pick another model in the extension preferences.\n\n${message}`;
  }
  if (response.status === 401 || response.status === 403) {
    return `The AI server rejected the request (${response.status}). Check the API key in the extension preferences.\n\n${message}`;
  }
  return `The AI server responded with ${response.status} ${response.statusText}.\n\n${message}`;
}

function describeConnectionError(error: unknown, config: AIConfig): string {
  const reason = error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : "";
  if (isOllama(config.baseUrl)) {
    return `Could not connect to Ollama at ${config.baseUrl}. Make sure Ollama is installed and running (\`ollama serve\`).\n\n${reason}`;
  }
  if (isLocalServer(config.baseUrl)) {
    return `Could not connect to your local AI server at ${config.baseUrl}. Make sure it is running.\n\n${reason}`;
  }
  return `Could not connect to ${config.baseUrl}.\n\n${reason}`;
}

/**
 * Sends the conversation to the configured chat completions endpoint and streams the answer.
 * `onText` is called with the full text generated so far every time new tokens arrive.
 */
export async function generateText(
  messages: ChatMessage[],
  options: { signal?: AbortSignal; onText?: (text: string) => void; config?: AIConfig } = {},
): Promise<string> {
  const config = options.config ?? getAIConfig();
  const body = buildRequestBody(messages, config);
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "text/event-stream" };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) {
      throw error;
    }
    throw new AIError(describeConnectionError(error, config));
  }

  if (!response.ok) {
    throw new AIError(await describeHttpError(response, config));
  }

  // Some servers ignore `stream: true` and answer with a single JSON document.
  if (!response.body || response.headers.get("content-type")?.includes("application/json")) {
    const json = (await response.json()) as CompletionChunk;
    const text = json.choices?.[0]?.message?.content ?? "";
    options.onText?.(text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      return;
    }
    const data = trimmed.slice(5).trim();
    if (data === "" || data === "[DONE]") {
      return;
    }
    let chunk: CompletionChunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      return;
    }
    if (chunk.error) {
      throw new AIError(typeof chunk.error === "string" ? chunk.error : (chunk.error.message ?? "Unknown AI error"));
    }
    const delta = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";
    if (delta) {
      text += delta;
      options.onText?.(text);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handleLine);
  }
  handleLine(buffer + decoder.decode());

  return stripThinking(text);
}

/** Reasoning models (deepseek-r1, qwen3…) include their chain of thought in `<think>` tags. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();
}
