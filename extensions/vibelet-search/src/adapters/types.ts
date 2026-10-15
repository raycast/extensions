import type { SessionMessage } from "../types";

/** Parsed message extracted from a single JSONL line. `null` = no user-visible message. */
export type ParsedLine = SessionMessage | null;

/**
 * Single source of truth for "given a JSONL line from source X, extract the visible message".
 * All consumers (title extraction, full conversation load, content-index segments) go through here.
 */
export interface FormatAdapter {
  format: "claude" | "codex";
  parseLine(raw: unknown): ParsedLine;
}
