import * as fs from "fs";
import { getAdapter, getFormatForSource, isMeaningfulUserMessage } from "./adapters";
import { warn } from "./logger";
import type { SessionMessage, SessionMeta } from "./types";

export const DEFAULT_MAX_LOADED_MESSAGES = 500;
export const DEFAULT_MAX_MESSAGE_CHARS = 12000;
export const DEFAULT_MAX_JSONL_LINE_BYTES = 2 * 1024 * 1024;
const TRUNCATED_MESSAGE_SUFFIX = "\n\n[Message truncated to keep Raycast responsive.]";

export interface LoadSessionMessagesOptions {
  /**
   * Upper bound for rendered/copied messages. Large sessions can contain tens of
   * thousands of turns; keeping a bounded preview avoids Raycast's 100 MB worker heap.
   */
  maxMessages?: number;
  /** Upper bound for each parsed message body before it is stored in React state. */
  maxMessageChars?: number;
  /** Upper bound for a raw JSONL line. Lines above this are skipped while streaming. */
  maxLineBytes?: number;
}

function truncateMessageContent(msg: SessionMessage, maxChars: number): SessionMessage {
  if (msg.content.length <= maxChars) return msg;
  return { ...msg, content: msg.content.slice(0, maxChars) + TRUNCATED_MESSAGE_SUFFIX };
}

/**
 * Stream JSONL lines from a file, dropping any single line above `maxLineBytes`.
 * Never buffers the whole file — used for full conversation loads.
 */
export async function* readJsonlLines(filePath: string, maxLineBytes: number): AsyncGenerator<string> {
  const stream = fs.createReadStream(filePath, { encoding: "utf-8", highWaterMark: 64 * 1024 });
  let buffered = "";
  let bufferedBytes = 0;
  let skippingLongLine = false;

  try {
    for await (const chunk of stream) {
      const text = String(chunk);
      let start = 0;

      while (start < text.length) {
        const newlineIndex = text.indexOf("\n", start);
        const segmentEnd = newlineIndex === -1 ? text.length : newlineIndex;
        const segment = text.slice(start, segmentEnd);

        if (!skippingLongLine) {
          buffered += segment;
          bufferedBytes += Buffer.byteLength(segment, "utf-8");
          if (bufferedBytes > maxLineBytes) {
            buffered = "";
            bufferedBytes = 0;
            skippingLongLine = true;
          }
        }

        if (newlineIndex === -1) break;

        if (skippingLongLine) {
          skippingLongLine = false;
        } else {
          yield buffered.endsWith("\r") ? buffered.slice(0, -1) : buffered;
        }
        buffered = "";
        bufferedBytes = 0;
        start = newlineIndex + 1;
      }
    }

    if (!skippingLongLine && buffered) {
      yield buffered.endsWith("\r") ? buffered.slice(0, -1) : buffered;
    }
  } finally {
    stream.destroy();
  }
}

/**
 * Stream-parse a JSONL file's head, stopping as soon as `stop` returns true
 * (or `maxBytes` of line content has been consumed). Used by title extraction so a
 * session whose first prompt is in the first few bytes doesn't pay for reading the rest.
 */
export async function readJsonlUntil(
  filePath: string,
  maxBytes: number,
  stop?: (parsed: unknown) => boolean,
): Promise<unknown[]> {
  const results: unknown[] = [];
  let bytesRead = 0;
  let buffered = "";
  let done = false;

  try {
    const stream = fs.createReadStream(filePath, { encoding: "utf-8", highWaterMark: 64 * 1024 });
    for await (const chunk of stream) {
      if (done) break;
      const text = String(chunk);
      let start = 0;

      while (start < text.length) {
        if (done || bytesRead >= maxBytes) {
          done = true;
          break;
        }
        const newlineIndex = text.indexOf("\n", start);
        const segmentEnd = newlineIndex === -1 ? text.length : newlineIndex;
        const segment = text.slice(start, segmentEnd);
        bytesRead += Buffer.byteLength(segment, "utf-8");
        buffered += segment;

        if (newlineIndex === -1) break; // partial line — wait for the next chunk

        const line = buffered.trim();
        buffered = "";
        start = newlineIndex + 1;
        if (!line) continue;

        try {
          const parsed = JSON.parse(line);
          results.push(parsed);
          if (stop && stop(parsed)) done = true;
        } catch {
          // Single malformed JSONL line — skip but keep parsing the rest
        }
      }
      // Breaking out of for-await closes the stream cleanly; don't destroy() mid-iteration
      // (that would throw ERR_STREAM_PREMATURE_CLOSE and discard the lines already read).
      if (done) break;
    }
  } catch (e) {
    // A benign premature-close can surface when we break out of the stream — treat it as
    // a normal stop and keep whatever was already parsed.
    const err = e as { code?: string };
    if (err?.code !== "ERR_STREAM_PREMATURE_CLOSE") {
      warn(`readJsonlUntil failed for ${filePath}:`, e);
      return [];
    }
  }

  return results;
}

/**
 * Load messages for a single session without reading the whole JSONL file into memory.
 * Called lazily when the user opens the detail view.
 *
 * NOTE: the set of messages this returns (order and filtering) is the *seq contract* that
 * `content-index` segments mirror — a message's index here must equal its segment line
 * number. If the filtering changes here, `content-index.ts` must change identically.
 */
export async function loadSessionMessages(
  meta: SessionMeta,
  options: LoadSessionMessagesOptions = {},
): Promise<SessionMessage[]> {
  const adapter = getAdapter(getFormatForSource(meta.source));
  const messages: SessionMessage[] = [];
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_LOADED_MESSAGES;
  const maxMessageChars = options.maxMessageChars ?? DEFAULT_MAX_MESSAGE_CHARS;
  const maxLineBytes = options.maxLineBytes ?? DEFAULT_MAX_JSONL_LINE_BYTES;

  try {
    for await (const line of readJsonlLines(meta.filePath, maxLineBytes)) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      const msg = adapter.parseLine(parsed);
      if (!msg) continue;
      // Suppress auto-injected user-role events (system reminders, hook output, slash-command
      // wrappers, interrupted-by-user markers, ...) so the conversation view shows only what
      // the user actually typed and the assistant actually said.
      if (msg.role === "user" && !isMeaningfulUserMessage(msg.content)) continue;
      messages.push(truncateMessageContent(msg, maxMessageChars));
      if (messages.length >= maxMessages) break;
    }
  } catch (e) {
    warn(`failed to read session ${meta.filePath}:`, e);
    return messages;
  }

  return messages;
}
