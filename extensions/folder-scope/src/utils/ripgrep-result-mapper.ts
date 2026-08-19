import { basename, isAbsolute, relative, resolve } from "node:path";
import type { RipgrepEvent, SearchResult } from "../types/search.ts";

type ResultEmitter = (results: SearchResult[]) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Decodes ripgrep's `{ text }` or base64 `{ bytes }` representation. */
export function decodeRipgrepText(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.text === "string") return value.text;
  if (typeof value.bytes === "string") {
    try {
      return Buffer.from(value.bytes, "base64").toString("utf8");
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function withoutLineEnding(value: string): string {
  return value.replace(/\r?\n$/, "");
}

function asPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function matchResults(data: unknown, directory: string, contextBefore: string[]): SearchResult[] | undefined {
  if (!isRecord(data)) return undefined;
  const rawPath = decodeRipgrepText(data.path);
  const rawLine = decodeRipgrepText(data.lines);
  const line = asPositiveInteger(data.line_number);
  if (rawPath === undefined || rawLine === undefined || line === undefined || !Array.isArray(data.submatches)) {
    return undefined;
  }

  const filePath = isAbsolute(rawPath) ? rawPath : resolve(directory, rawPath);
  const relativePath = relative(directory, filePath) || basename(filePath);
  const lineText = withoutLineEnding(rawLine);
  const results: SearchResult[] = [];

  for (const submatch of data.submatches) {
    if (!isRecord(submatch) || typeof submatch.start !== "number" || submatch.start < 0) continue;
    results.push({
      filePath,
      relativePath,
      fileName: basename(filePath),
      line,
      // Ripgrep offsets are byte offsets. Keeping that convention avoids a
      // false character column when a line/path contains non-UTF-8 bytes.
      column: Math.trunc(submatch.start) + 1,
      lineText,
      ...(contextBefore.length > 0 ? { contextBefore: [...contextBefore] } : {}),
    });
  }
  return results;
}

function contextLine(data: unknown): string | undefined {
  if (!isRecord(data)) return undefined;
  const lines = decodeRipgrepText(data.lines);
  return lines === undefined ? undefined : withoutLineEnding(lines);
}

/**
 * Stateful mapper that delays match emission just long enough to attach the
 * following context events emitted by ripgrep.
 */
export class RipgrepResultMapper {
  private readonly directory: string;
  private readonly beforeCount: number;
  private readonly afterCount: number;
  private readonly emit: ResultEmitter;
  private recentContext: string[] = [];
  private pending: SearchResult[] = [];

  constructor(directory: string, beforeCount: number, afterCount: number, emit: ResultEmitter) {
    this.directory = directory;
    this.beforeCount = beforeCount;
    this.afterCount = afterCount;
    this.emit = emit;
  }

  consume(event: RipgrepEvent): boolean {
    switch (event.type) {
      case "begin":
        this.flush();
        this.recentContext = [];
        return true;
      case "match": {
        this.flush();
        const results = matchResults(event.data, this.directory, this.recentContext);
        this.recentContext = [];
        if (results === undefined) return false;
        this.pending = results;
        if (this.afterCount === 0) this.flush();
        return true;
      }
      case "context": {
        const line = contextLine(event.data);
        if (line === undefined) return false;
        for (const result of this.pending) {
          const after = result.contextAfter ?? [];
          if (after.length < this.afterCount) after.push(line);
          if (after.length > 0) result.contextAfter = after;
        }
        if (
          this.pending.length > 0 &&
          this.pending.every((result) => result.contextAfter?.length === this.afterCount)
        ) {
          this.flush();
        }
        if (this.beforeCount > 0) {
          this.recentContext.push(line);
          if (this.recentContext.length > this.beforeCount) this.recentContext.shift();
        }
        return true;
      }
      case "end":
        this.flush();
        this.recentContext = [];
        return true;
      case "summary":
        this.flush();
        return true;
    }
  }

  finish(): void {
    this.flush();
    this.recentContext = [];
  }

  private flush(): void {
    if (this.pending.length === 0) return;
    const results = this.pending;
    this.pending = [];
    this.emit(results);
  }
}
