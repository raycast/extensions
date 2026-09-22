import { createReadStream } from "node:fs";

export interface JsonlLine {
  text: string;
  /** absolute byte offset just past this line (including its newline, when present) */
  end: number;
  partial: boolean;
}

/**
 * Stream lines from a JSONL file starting at a byte offset, tracking byte positions so
 * append-only files can be resumed later. A trailing line without newline is yielded with
 * `partial: true` so callers can decide whether to trust it.
 */
export async function* readJsonlLines(file: string, start = 0): AsyncGenerator<JsonlLine> {
  const stream = createReadStream(file, { start, highWaterMark: 1 << 20 });
  let pos = start;
  let carry: Buffer[] = [];
  let carryLen = 0;
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    let from = 0;
    for (;;) {
      const nl = chunk.indexOf(10, from);
      if (nl === -1) break;
      const piece = chunk.subarray(from, nl);
      let lineBuf: Buffer;
      if (carryLen > 0) {
        carry.push(piece);
        lineBuf = Buffer.concat(carry);
        carry = [];
        carryLen = 0;
      } else {
        lineBuf = piece;
      }
      pos += nl - from + 1;
      const text = lineBuf.toString("utf8");
      if (text.length > 1) yield { text, end: pos, partial: false };
      from = nl + 1;
    }
    if (from < chunk.length) {
      const rest = chunk.subarray(from);
      carry.push(rest);
      carryLen += rest.length;
      pos += rest.length;
    }
  }
  if (carryLen > 0) {
    const text = Buffer.concat(carry).toString("utf8");
    if (text.trim().length > 0) yield { text, end: pos, partial: true };
  }
}

export function safeJson<T = unknown>(line: string): T | null {
  try {
    return JSON.parse(line) as T;
  } catch {
    return null;
  }
}
