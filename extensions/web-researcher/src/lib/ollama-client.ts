// ─── Types ───────────────────────────────────────────────────────────

export interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

interface OllamaTagsResponse {
  readonly models?: ReadonlyArray<{ readonly name: string }>;
}

interface OllamaStreamChunk {
  readonly message?: { readonly content?: string };
  readonly done?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────

const HEALTH_TIMEOUT_MS = 5000;
const LIST_TIMEOUT_MS = 10000;

// ─── Health Check ────────────────────────────────────────────────────

export async function checkHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ─── List Models ─────────────────────────────────────────────────────

export async function listModels(baseUrl: string): Promise<readonly string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with status ${response.status}`);
    }

    const data = (await response.json()) as OllamaTagsResponse;
    const models = data.models ?? [];
    return models.map((m) => m.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list Ollama models: ${message}`);
  }
}

// ─── Streaming Chat ──────────────────────────────────────────────────

export async function streamChat(
  baseUrl: string,
  model: string,
  messages: readonly ChatMessage[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetchChatStream(baseUrl, model, messages, signal);
  return readStreamTokens(response, onToken);
}

async function fetchChatStream(
  baseUrl: string,
  model: string,
  messages: readonly ChatMessage[],
  signal?: AbortSignal,
): Promise<Response> {
  const body = JSON.stringify({
    model,
    messages,
    stream: true,
  });

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Ollama chat failed (${response.status}): ${errorText}`);
  }

  return response;
}

async function readStreamTokens(
  response: Response,
  onToken: (token: string) => void,
): Promise<string> {
  const responseBody = response.body;
  if (!responseBody) {
    throw new Error("Response body is null — streaming not supported");
  }

  const reader = responseBody.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const result = processBuffer(buffer, onToken);
      accumulated += result.tokens;
      buffer = result.remaining;
    }

    // Process any remaining data in the buffer
    if (buffer.trim().length > 0) {
      const finalTokens = parseChunkContent(buffer.trim());
      if (finalTokens) {
        onToken(finalTokens);
        accumulated += finalTokens;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

interface BufferProcessResult {
  readonly tokens: string;
  readonly remaining: string;
}

function processBuffer(
  buffer: string,
  onToken: (token: string) => void,
): BufferProcessResult {
  const lines = buffer.split("\n");
  // The last element may be an incomplete line, keep it in the buffer
  const remaining = lines.pop() ?? "";
  let tokens = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    const content = parseChunkContent(trimmed);
    if (content) {
      onToken(content);
      tokens += content;
    }
  }

  return { tokens, remaining };
}

function parseChunkContent(line: string): string | null {
  try {
    const chunk = JSON.parse(line) as OllamaStreamChunk;
    return chunk.message?.content ?? null;
  } catch {
    // Skip malformed JSON lines
    return null;
  }
}
