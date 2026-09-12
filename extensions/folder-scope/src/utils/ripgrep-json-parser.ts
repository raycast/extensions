import { StringDecoder } from "node:string_decoder";
import type { RipgrepEvent, RipgrepEventKind } from "../types/search.ts";

const EVENT_KINDS = new Set<RipgrepEventKind>(["begin", "match", "context", "end", "summary"]);

export type RipgrepParserRecord =
  | { kind: "event"; event: RipgrepEvent }
  | { kind: "unknown"; type: string; data: unknown }
  | { kind: "malformed"; line: string; reason: string };

/** Incremental, newline-delimited parser for `rg --json` stdout. */
export class RipgrepJsonParser {
  private readonly decoder = new StringDecoder("utf8");
  private readonly maxRecordBytes: number;
  private buffer = "";
  private discardingOversizedLine = false;

  constructor(maxRecordBytes = 4 * 1024 * 1024) {
    this.maxRecordBytes = maxRecordBytes;
  }

  push(chunk: Uint8Array | string): RipgrepParserRecord[] {
    const text = typeof chunk === "string" ? chunk : this.decoder.write(Buffer.from(chunk));
    return this.consume(text);
  }

  finish(): RipgrepParserRecord[] {
    const records = this.consume(this.decoder.end());
    if (!this.discardingOversizedLine && this.buffer.length > 0) {
      records.push(this.parseLine(this.buffer.replace(/\r$/, "")));
    }
    this.buffer = "";
    this.discardingOversizedLine = false;
    return records;
  }

  private consume(text: string): RipgrepParserRecord[] {
    const records: RipgrepParserRecord[] = [];
    let remaining = this.buffer + text;
    this.buffer = "";

    while (remaining.length > 0) {
      if (this.discardingOversizedLine) {
        const end = remaining.indexOf("\n");
        if (end === -1) return records;
        remaining = remaining.slice(end + 1);
        this.discardingOversizedLine = false;
        continue;
      }

      const end = remaining.indexOf("\n");
      if (end === -1) {
        if (Buffer.byteLength(remaining) > this.maxRecordBytes) {
          records.push({ kind: "malformed", line: "", reason: "ripgrep JSON record exceeds the size limit" });
          this.discardingOversizedLine = true;
        } else {
          this.buffer = remaining;
        }
        return records;
      }

      const line = remaining.slice(0, end).replace(/\r$/, "");
      remaining = remaining.slice(end + 1);
      if (line.length === 0) continue;
      if (Buffer.byteLength(line) > this.maxRecordBytes) {
        records.push({ kind: "malformed", line: "", reason: "ripgrep JSON record exceeds the size limit" });
      } else {
        records.push(this.parseLine(line));
      }
    }

    return records;
  }

  private parseLine(line: string): RipgrepParserRecord {
    try {
      const parsed: unknown = JSON.parse(line);
      if (!isRecord(parsed) || typeof parsed.type !== "string" || !("data" in parsed)) {
        return { kind: "malformed", line, reason: "ripgrep JSON record has an invalid event shape" };
      }
      if (!EVENT_KINDS.has(parsed.type as RipgrepEventKind)) {
        return { kind: "unknown", type: parsed.type, data: parsed.data };
      }
      return {
        kind: "event",
        event: { type: parsed.type as RipgrepEventKind, data: parsed.data },
      };
    } catch (error) {
      return {
        kind: "malformed",
        line,
        reason: error instanceof Error ? error.message : "invalid ripgrep JSON",
      };
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
