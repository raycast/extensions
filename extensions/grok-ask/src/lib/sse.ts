import type { SSEEvent } from "../types";

export function parseSSEChunk(
  chunk: string,
  buffer: string,
): { events: SSEEvent[]; remaining: string } {
  const combined = buffer + chunk;
  const events: SSEEvent[] = [];
  const blocks = combined.split("\n\n");
  const remaining = blocks.pop() || "";

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    let event = "";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        event = line.slice(7);
      } else if (line.startsWith("data: ")) {
        dataLines.push(line.slice(6));
      }
    }

    if (dataLines.length > 0) {
      events.push({
        event: event || "message",
        data: dataLines.join("\n"),
      });
    }
  }

  return { events, remaining };
}
