import type { ChatMessage, ProviderProfile } from "./types";
import { chatCompletionsUrl, modelsUrl } from "./url";

export interface StreamDelta {
  content?: string;
  reasoning?: string;
}

export interface CompletionResult {
  content: string;
  reasoning: string;
}

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

function requestHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  };
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
  return headers;
}

async function parseError(response: Response): Promise<ProviderRequestError> {
  let detail = response.statusText;
  try {
    const body = (await response.json()) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof body.error === "string") detail = body.error;
    else if (body.error?.message) detail = body.error.message;
    else if (body.message) detail = body.message;
  } catch {
    // Keep the HTTP status text when the endpoint does not return JSON.
  }

  const prefix =
    response.status === 401 || response.status === 403
      ? "Authentication failed"
      : response.status === 404
        ? "Endpoint or model not found"
        : response.status === 429
          ? "Rate limit exceeded"
          : `Provider returned HTTP ${response.status}`;
  return new ProviderRequestError(`${prefix}: ${detail}`, response.status);
}

function withTimeout(
  signal: AbortSignal | undefined,
  milliseconds: number,
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(milliseconds);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

export async function listModels(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const response = await fetch(modelsUrl(baseUrl), {
    method: "GET",
    headers: requestHeaders(apiKey),
    signal: withTimeout(signal, 20_000),
  });
  if (!response.ok) throw await parseError(response);

  const body = (await response.json()) as { data?: Array<{ id?: unknown }> };
  if (!Array.isArray(body.data))
    throw new ProviderRequestError("The models response has no data array.");
  return body.data
    .map((model) => (typeof model.id === "string" ? model.id.trim() : ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function messageContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (typeof part === "string") return part;
      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof part.text === "string"
      )
        return part.text;
      return "";
    })
    .join("");
}

export function extractDelta(value: unknown): StreamDelta {
  if (!value || typeof value !== "object") return {};
  const choice = Array.isArray((value as { choices?: unknown[] }).choices)
    ? (value as { choices: Array<Record<string, unknown>> }).choices[0]
    : undefined;
  if (!choice) return {};
  const delta = choice.delta as Record<string, unknown> | undefined;
  const message = choice.message as Record<string, unknown> | undefined;
  const source = delta ?? message ?? {};
  return {
    content: messageContent(source.content),
    reasoning: messageContent(source.reasoning_content ?? source.reasoning),
  };
}

export function parseEventData(data: string): StreamDelta | undefined {
  const trimmed = data.trim();
  if (!trimmed || trimmed === "[DONE]") return undefined;
  try {
    return extractDelta(JSON.parse(trimmed));
  } catch {
    return undefined;
  }
}

export async function streamChatCompletion(options: {
  provider: ProviderProfile;
  modelId: string;
  systemPrompt: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onDelta: (delta: StreamDelta) => void;
}): Promise<CompletionResult> {
  const { provider, modelId, systemPrompt, messages, signal, onDelta } =
    options;
  const requestMessages = [
    ...(systemPrompt.trim()
      ? [{ role: "system", content: systemPrompt.trim() }]
      : []),
    ...messages.map(({ role, content }) => ({ role, content })),
  ];

  const response = await fetch(chatCompletionsUrl(provider.baseUrl), {
    method: "POST",
    headers: requestHeaders(provider.apiKey),
    body: JSON.stringify({
      model: modelId,
      messages: requestMessages,
      stream: true,
    }),
    signal: withTimeout(signal, 10 * 60_000),
  });
  if (!response.ok) throw await parseError(response);

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/event-stream") || !response.body) {
    const body = (await response.json()) as unknown;
    const delta = extractDelta(body);
    if (!delta.content && !delta.reasoning) {
      throw new ProviderRequestError(
        "The provider returned no assistant content.",
      );
    }
    onDelta(delta);
    return { content: delta.content ?? "", reasoning: delta.reasoning ?? "" };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";

  const consumeLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const delta = parseEventData(line.slice(5));
    if (!delta) return;
    content += delta.content ?? "";
    reasoning += delta.reasoning ?? "";
    onDelta(delta);
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) consumeLine(line);
    if (done) break;
  }
  if (buffer) consumeLine(buffer);

  if (!content && !reasoning)
    throw new ProviderRequestError(
      "The provider stream returned no assistant content.",
    );
  return { content, reasoning };
}
