import { TextDecoder } from "node:util";
import { normalizeBaseUrl } from "../config/providers";
import type { ModelRef } from "../types";
import { isRecord } from "./guards";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StreamChatCompletionOptions {
  modelRef: ModelRef;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
  onUsage?: (tokens: number) => void;
}

export class ChatRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatRequestError";
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl);

  if (!normalized) {
    throw new ChatRequestError("The model Base URL is empty");
  }

  return `${normalized}/chat/completions`;
}

export async function streamChatCompletion(options: StreamChatCompletionOptions): Promise<string> {
  const { modelRef, messages, signal, onDelta, onUsage } = options;
  const url = buildChatCompletionsUrl(modelRef.baseUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream, application/json",
  };

  if (modelRef.apiKey) {
    headers.Authorization = `Bearer ${modelRef.apiKey}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: modelRef.modelId,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal,
  });

  if (!response.ok) {
    throw new ChatRequestError(await readErrorMessage(response));
  }

  if (!response.body) {
    throw new ChatRequestError("The model gateway returned no response body");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    return readNonStreamingResponse(response, onDelta, onUsage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let received = "";
  let done = false;

  const processLine = async (line: string): Promise<boolean> => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data:")) {
      return false;
    }

    const payload = trimmed.slice("data:".length).trim();
    if (!payload) {
      return false;
    }

    if (payload === "[DONE]") {
      return true;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return false;
    }

    const delta = extractContent(parsed);
    if (delta.length > 0) {
      received += delta;
      onDelta(delta);
    }

    const tokens = extractUsageTokens(parsed);
    if (tokens !== undefined) {
      onUsage?.(tokens);
    }

    return false;
  };

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (readerDone) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (await processLine(line)) {
        done = true;
        break;
      }
    }
  }

  if (!done && buffer.length > 0) {
    done = await processLine(buffer);
  }

  return received;
}

function extractContent(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.choices) || payload.choices.length === 0) {
    return "";
  }

  const first = payload.choices[0];
  if (!isRecord(first)) {
    return "";
  }

  const source = isRecord(first.delta) ? first.delta : isRecord(first.message) ? first.message : undefined;
  if (!source || typeof source.content !== "string") {
    return "";
  }

  return source.content;
}

function extractUsageTokens(payload: unknown): number | undefined {
  if (!isRecord(payload) || !isRecord(payload.usage)) {
    return undefined;
  }

  const total = payload.usage.total_tokens;
  return typeof total === "number" && Number.isFinite(total) ? total : undefined;
}

async function readNonStreamingResponse(
  response: Response,
  onDelta: (delta: string) => void,
  onUsage?: (tokens: number) => void,
): Promise<string> {
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new ChatRequestError("The model gateway returned invalid JSON");
  }

  const content = extractContent(parsed);
  if (content.length === 0) {
    throw new ChatRequestError("The model response contains no text content");
  }

  const tokens = extractUsageTokens(parsed);
  if (tokens !== undefined) {
    onUsage?.(tokens);
  }

  onDelta(content);
  return content;
}

async function readErrorMessage(response: Response): Promise<string> {
  const raw = await response.text().catch(() => "");
  const parsed = parseJson(raw);

  if (isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.message === "string") {
    return parsed.error.message;
  }

  if (isRecord(parsed) && typeof parsed.message === "string") {
    return parsed.message;
  }

  return raw.trim().slice(0, 500) || `HTTP ${response.status}`;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
