import type { ChatStreamChunk } from "./types";

/**
 * Parse an SSE (Server-Sent Events) stream from an OpenAI-compatible
 * chat completions endpoint, yielding content tokens as they arrive.
 *
 * Handles:
 * - `data: {json}` lines → yields delta content
 * - `data: [DONE]`      → terminates
 * - Partial lines across chunk boundaries (buffering)
 * - Empty lines and SSE comment lines (`:` prefix)
 * - Malformed JSON (warns and skips)
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let consecutiveParseFailures = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on newline boundaries — keep the last element as the
      // partial-line buffer (it's "" if the chunk ended on a newline).
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and SSE comments
        if (trimmed === "" || trimmed.startsWith(":")) {
          continue;
        }

        // Only process `data:` lines
        if (!trimmed.startsWith("data:")) {
          continue;
        }

        const payload = trimmed.slice("data:".length).trim();

        // Termination sentinel
        if (payload === "[DONE]") {
          return;
        }

        // Parse JSON payload
        let chunk: ChatStreamChunk;
        try {
          chunk = JSON.parse(payload) as ChatStreamChunk;
          consecutiveParseFailures = 0;
        } catch {
          consecutiveParseFailures++;
          console.warn("[streaming] Malformed JSON, skipping:", payload);
          if (consecutiveParseFailures >= 5) {
            throw new Error(
              "Server is sending malformed response data. Check that your server supports the OpenAI streaming format.",
            );
          }
          continue;
        }

        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    }

    // Process any remaining buffered data after the stream ends
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data:") && !trimmed.startsWith("data: [DONE]")) {
        const payload = trimmed.slice("data:".length).trim();
        try {
          const chunk = JSON.parse(payload) as ChatStreamChunk;
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          console.warn(
            "[streaming] Malformed JSON in final buffer, skipping:",
            payload,
          );
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Collect an entire SSE stream into a single concatenated string.
 * Useful as a non-streaming fallback: sends the request with stream: true
 * but waits for the full response before returning.
 */
export async function streamToString(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  let result = "";
  for await (const token of parseSSEStream(stream)) {
    result += token;
  }
  return result;
}
