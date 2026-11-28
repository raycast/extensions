import { USER_AGENT, WiroError, type Credentials } from "./wiro";
import { isListedModel } from "./params";

export const GATEWAY_BASE_URL = "https://llm.wiro.ai/v1";

export interface ChatModel {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  /** USD per input token. */
  promptPrice?: number;
  /** USD per output token. */
  completionPrice?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
}

interface GatewayModel {
  id?: string;
  name?: string;
  display_name?: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string | number; completion?: string | number };
}

/** The gateway takes the key, or `key:secret` for signature projects, as a Bearer credential. */
export function bearerToken(credentials: Credentials): string {
  const key = credentials.apiKey.trim();
  const secret = credentials.apiSecret?.trim();
  return `Bearer ${secret ? `${key}:${secret}` : key}`;
}

/** "(Wiro) GPT-5.4 Mini" becomes "GPT-5.4 Mini". */
export function displayName(name: string | undefined, id: string): string {
  const cleaned = (name ?? "").replace(/^\(Wiro\)\s*/i, "").trim();
  return cleaned || id;
}

function price(value: string | number | undefined): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

/** The models the gateway serves. No API key is needed. */
export async function listChatModels(signal?: AbortSignal): Promise<ChatModel[]> {
  const response = await fetch(`${GATEWAY_BASE_URL}/models`, { headers: { "User-Agent": USER_AGENT }, signal });
  if (!response.ok) throw new WiroError(`Could not load the model list (HTTP ${response.status}).`, response.status);
  const body = (await response.json()) as { data?: GatewayModel[] };
  return (body.data ?? [])
    .filter((model): model is GatewayModel & { id: string } => typeof model.id === "string" && model.id.length > 0)
    .filter((model) => isListedModel(model.id, model.name ?? ""))
    .map((model) => ({
      id: model.id,
      name: displayName(model.display_name ?? model.name, model.id),
      description: model.description,
      contextLength: model.context_length,
      promptPrice: price(model.pricing?.prompt),
      completionPrice: price(model.pricing?.completion),
    }));
}

/**
 * Splits a server-sent event stream into the `data:` payload of each event. Feed it text as it
 * arrives; call `end()` when the stream closes to flush the last event.
 */
export function createSseParser(onData: (data: string) => void): { push(chunk: string): void; end(): void } {
  let buffer = "";
  let lines: string[] = [];

  const dispatch = () => {
    if (lines.length > 0) onData(lines.join("\n"));
    lines = [];
  };

  const handleLine = (line: string) => {
    if (line === "") {
      dispatch();
      return;
    }
    if (line.startsWith(":")) return;
    if (line.startsWith("data:")) {
      lines.push(line.slice(5).replace(/^ /, ""));
    }
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      let index: number;
      while ((index = buffer.search(/\r?\n/)) !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(buffer[index] === "\r" ? index + 2 : index + 1);
        handleLine(line);
      }
    },
    end() {
      if (buffer) handleLine(buffer);
      buffer = "";
      dispatch();
    },
  };
}

interface ChatChunk {
  choices?: Array<{ delta?: { content?: string | null }; message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  error?: { message?: string } | string;
}

function chunkError(chunk: ChatChunk): string | undefined {
  if (!chunk.error) return undefined;
  return typeof chunk.error === "string" ? chunk.error : chunk.error.message || "The model returned an error.";
}

async function gatewayError(response: Response): Promise<WiroError> {
  const text = await response.text();
  let message = "";
  try {
    const body = JSON.parse(text) as ChatChunk & { message?: string };
    message = chunkError(body) ?? body.message ?? "";
  } catch {
    message = /^\s*</.test(text) ? "" : text.trim().slice(0, 300);
  }
  if (response.status === 401 || response.status === 403) {
    return new WiroError(
      message ? `Wiro AI rejected the API key: ${message}` : "Wiro AI rejected the API key.",
      response.status,
    );
  }
  return new WiroError(
    message ? `Wiro AI error ${response.status}: ${message}` : `Wiro AI error ${response.status}`,
    response.status,
  );
}

export interface StreamChatOptions {
  model: string;
  messages: ChatMessage[];
  credentials: Credentials;
  sessionId?: string;
  signal?: AbortSignal;
  /** Called with the whole answer so far each time new text arrives. */
  onText?: (text: string) => void;
}

/** Sends a Chat Completions request and streams the answer. Resolves with the full answer. */
export async function streamChat(options: StreamChatOptions): Promise<{ text: string; usage?: ChatUsage }> {
  const response = await fetch(`${GATEWAY_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: bearerToken(options.credentials),
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
      stream_options: { include_usage: true },
      ...(options.sessionId ? { session_id: options.sessionId } : {}),
    }),
    signal: options.signal,
  });
  if (!response.ok) throw await gatewayError(response);

  let text = "";
  let usage: ChatUsage | undefined;
  let failure: string | undefined;

  const handle = (data: string) => {
    if (data === "[DONE]" || failure) return;
    let chunk: ChatChunk;
    try {
      chunk = JSON.parse(data) as ChatChunk;
    } catch {
      return;
    }
    failure = chunkError(chunk);
    if (failure) return;
    const piece = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";
    if (piece) {
      text += piece;
      options.onText?.(text);
    }
    if (chunk.usage) {
      usage = { promptTokens: chunk.usage.prompt_tokens, completionTokens: chunk.usage.completion_tokens };
    }
  };

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !response.body) {
    handle(await response.text());
  } else {
    const parser = createSseParser(handle);
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.end();
  }

  if (failure) throw new WiroError(failure);
  if (!text) throw new WiroError("The model sent an empty answer. Try again or pick another model.");
  return { text, usage };
}
