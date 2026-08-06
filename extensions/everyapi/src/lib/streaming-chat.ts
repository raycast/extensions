import type { ChatMessage } from "./api";
import { ApiError, authenticatedFetch, type AuthTokenProvider } from "./http";
import type { FetchLike } from "./oauth-protocol";

interface ChatSSEEvent {
  content?: string;
  totalTokens?: number;
  done: boolean;
}

export function parseChatSSEData(data: string): ChatSSEEvent | undefined {
  if (data.trim() === "[DONE]") return { done: true };
  try {
    const event = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    return {
      content: event.choices?.[0]?.delta?.content,
      totalTokens: event.usage?.total_tokens,
      done: false,
    };
  } catch {
    return undefined;
  }
}

function responseErrorMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as {
      message?: unknown;
      error?: { message?: unknown } | string;
    };
    const candidate =
      typeof parsed.error === "object"
        ? parsed.error?.message
        : parsed.error || parsed.message;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  } catch {
    if (body.trim() && body.length < 300) return body.trim();
  }
  return `EveryAPI request failed (HTTP ${status})`;
}

export async function streamChatCompletion(options: {
  auth: AuthTokenProvider;
  fetch?: FetchLike;
  origin: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  includeUsage?: boolean;
  signal?: AbortSignal;
  onDelta: (content: string) => void;
}): Promise<{ totalTokens?: number }> {
  const response = await authenticatedFetch(
    options.auth,
    options.fetch ?? globalThis.fetch,
    `${options.origin.replace(/\/+$/, "")}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        stream: true,
        ...(options.includeUsage
          ? { stream_options: { include_usage: true } }
          : {}),
      }),
      signal: options.signal,
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(
      response.status,
      responseErrorMessage(body, response.status),
    );
  }
  if (!response.body) {
    throw new ApiError(response.status, "EveryAPI returned an empty stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let totalTokens: number | undefined;
  let reading = true;
  while (reading) {
    const { done, value } = await reader.read();
    reading = !done;
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const event = parseChatSSEData(line.slice(5).trim());
      if (!event) continue;
      if (event.content) options.onDelta(event.content);
      if (event.totalTokens !== undefined) totalTokens = event.totalTokens;
      if (event.done) return { totalTokens };
    }
    if (!reading) return { totalTokens };
  }
  return { totalTokens };
}
