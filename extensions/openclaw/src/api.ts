import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  gatewayUrl: string;
  authToken?: string;
  agentId?: string;
  model?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StreamDelta {
  role?: string;
  content?: string;
}

interface StreamChoice {
  index: number;
  delta: StreamDelta;
  finish_reason: string | null;
}

interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
}

function getConfig(): Preferences {
  return getPreferenceValues<Preferences>();
}

function buildHeaders(): Record<string, string> {
  const { authToken, agentId } = getConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  if (agentId) {
    headers["x-openclaw-agent-id"] = agentId;
  }
  return headers;
}

function buildUrl(path: string): string {
  const { gatewayUrl } = getConfig();
  const base = gatewayUrl.replace(/\/+$/, "");
  return `${base}${path}`;
}

function getModelId(): string {
  const { model, agentId } = getConfig();
  if (model) return model;
  return agentId ? `openclaw:${agentId}` : "openclaw";
}

/**
 * Send a non-streaming chat completion request to the OpenClaw Gateway.
 */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const url = buildUrl("/v1/chat/completions");
  const body = JSON.stringify({
    model: getModelId(),
    messages,
    stream: false,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 405) {
      const { authToken } = getConfig();
      if (!authToken) {
        throw new Error(
          "OpenClaw Gateway returned 405 (Method Not Allowed). This usually means authentication is required. Please set your Auth Token in the extension preferences."
        );
      }
      throw new Error(
        "OpenClaw Gateway returned 405 (Method Not Allowed). Your auth token may be invalid. Please check your Auth Token in the extension preferences."
      );
    }
    throw new Error(`OpenClaw Gateway error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No response content from OpenClaw");
  }
  return content;
}

/**
 * Send a streaming chat completion request to the OpenClaw Gateway.
 * Calls `onChunk` with each incremental text piece, and `onDone` when complete.
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<void> {
  const url = buildUrl("/v1/chat/completions");
  const body = JSON.stringify({
    model: getModelId(),
    messages,
    stream: true,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body,
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 405) {
      const { authToken } = getConfig();
      if (!authToken) {
        throw new Error(
          "OpenClaw Gateway returned 405 (Method Not Allowed). This usually means authentication is required. Please set your Auth Token in the extension preferences."
        );
      }
      throw new Error(
        "OpenClaw Gateway returned 405 (Method Not Allowed). Your auth token may be invalid. Please check your Auth Token in the extension preferences."
      );
    }
    throw new Error(`OpenClaw Gateway error (${response.status}): ${text}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body from OpenClaw");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }

        try {
          const chunk = JSON.parse(data) as StreamChunk;
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onDone();
}

/**
 * Check if the OpenClaw Gateway is reachable.
 */
export async function checkGatewayHealth(): Promise<boolean> {
  try {
    const url = buildUrl("/v1/chat/completions");
    // Just check if the endpoint is reachable with a minimal request
    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model: getModelId(),
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
