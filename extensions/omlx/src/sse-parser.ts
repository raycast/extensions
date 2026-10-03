// Parse an OpenAI-compatible SSE chat stream into Raycast model-provider
// stream parts. Extracted from streamCompletion so the tricky edge cases
// (trailing data without a newline, tool calls that never receive a
// terminal marker, chunk boundaries splitting UTF-8 sequences) are unit
// testable without a live oMLX server.

export type SsePart =
  | { type: "reasoning-delta"; textDelta: string }
  | { type: "text-delta"; textDelta: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      input: unknown;
    };

interface ToolCallAccumulator {
  id: string;
  name: string;
  arguments: string;
}

const NEWLINE_BYTE = 10;

export function createSseParser() {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let pendingBytes: Uint8Array = new Uint8Array(0);
  let done = false;
  const toolCalls = new Map<number, ToolCallAccumulator>();

  // Emits every accumulated tool call exactly once: draining clears the
  // map, so finish_reason, [DONE], and end-of-stream cannot duplicate.
  const drainToolCalls = (): SsePart[] => {
    const parts: SsePart[] = [];
    for (const tc of toolCalls.values()) {
      if (!tc.id || !tc.name) {
        throw new Error("Incomplete tool call received from oMLX");
      }
      let input: unknown;
      try {
        input = JSON.parse(tc.arguments);
      } catch {
        throw new Error("Invalid tool call arguments received from oMLX");
      }
      parts.push({
        type: "tool-call",
        toolCallId: tc.id,
        toolName: tc.name,
        input,
      });
    }
    toolCalls.clear();
    return parts;
  };

  const processDataEvent = (data: string): SsePart[] => {
    if (data === "[DONE]") {
      done = true;
      return drainToolCalls();
    }
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      // Ignore malformed data events, but never swallow tool-input errors.
      return [];
    }
    if (parsed?.model === "keepalive") return [];
    const delta = parsed?.choices?.[0]?.delta;
    const finishReason = parsed?.choices?.[0]?.finish_reason;

    const parts: SsePart[] = [];
    if (delta?.reasoning_content) {
      parts.push({
        type: "reasoning-delta",
        textDelta: delta.reasoning_content,
      });
    }
    if (delta?.content) {
      parts.push({ type: "text-delta", textDelta: delta.content });
    }
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0;
        if (tc.id) {
          toolCalls.set(idx, {
            id: tc.id,
            name: tc.function?.name ?? "",
            arguments: tc.function?.arguments ?? "",
          });
        } else {
          const existing = toolCalls.get(idx);
          if (existing && tc.function?.arguments) {
            existing.arguments += tc.function.arguments;
          }
        }
      }
    }
    if (finishReason === "tool_calls") {
      parts.push(...drainToolCalls());
    }
    return parts;
  };

  const processLine = (line: string): SsePart[] => {
    if (!line.startsWith("data: ")) return [];
    return processDataEvent(line.slice(6).trim());
  };

  return {
    isDone: () => done,

    /** Feed one transport chunk; returns the stream parts it completed. */
    feed(chunk: Uint8Array | string): SsePart[] {
      if (done) return [];
      const bytes =
        typeof chunk === "string"
          ? encoder.encode(chunk)
          : (chunk as Uint8Array);
      const merged = new Uint8Array(pendingBytes.length + bytes.length);
      merged.set(pendingBytes);
      merged.set(bytes, pendingBytes.length);
      pendingBytes = merged;

      const parts: SsePart[] = [];
      let start = 0;
      for (let i = 0; i < pendingBytes.length; i++) {
        if (pendingBytes[i] !== NEWLINE_BYTE) continue;
        // Only newline-complete byte ranges are decoded, so a multi-byte
        // UTF-8 sequence split across chunks is never mangled.
        const line = decoder.decode(pendingBytes.subarray(start, i));
        start = i + 1;
        if (done) break;
        parts.push(...processLine(line));
      }
      pendingBytes = done ? new Uint8Array(0) : pendingBytes.subarray(start);
      return parts;
    },

    /**
     * Finalize the stream: process a trailing data event that arrived
     * without a newline, then emit tool calls that never received
     * finish_reason or [DONE]. No-op after a terminal marker.
     */
    flush(): SsePart[] {
      if (done) {
        pendingBytes = new Uint8Array(0);
        return [];
      }
      done = true;
      const parts: SsePart[] = [];
      if (pendingBytes.length > 0) {
        const line = decoder.decode(pendingBytes).trim();
        pendingBytes = new Uint8Array(0);
        parts.push(...processLine(line));
      }
      parts.push(...drainToolCalls());
      return parts;
    },
  };
}
