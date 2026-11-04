import { closeSync, openSync, readSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { Adapter } from "../adapters/types";
import { EventEngine } from "../engine";
import { applyEvent } from "../status";
import { AgentEvent, Session } from "../types";
import { SourceContext } from "./types";

export interface TranscriptCursor {
  identity: string;
  offset: number;
  context: SourceContext;
  skipping?: boolean;
  mtime: number;
  bootstrapping?: boolean;
  snapshot?: Session;
}

const WINDOW = 512 * 1024;
const MAX_BATCH = 1024 * 1024;

/** Bounded byte reader; incomplete trailing JSON is retried, oversized records are skipped. */
export function readTranscriptBatch(path: string, previous?: TranscriptCursor, fromStart = false) {
  const stat = statSync(path);
  if (!stat.isFile()) throw new Error("Transcript is not a regular file");
  const identity = `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
  const reset =
    !previous ||
    previous.identity !== identity ||
    stat.size < previous.offset ||
    (stat.size === previous.offset && stat.mtimeMs !== previous.mtime);
  const start = reset ? (fromStart ? 0 : Math.max(0, stat.size - WINDOW)) : previous.offset;
  const cursor: TranscriptCursor = {
    identity,
    offset: start,
    context: reset ? {} : { ...previous.context },
    skipping: reset ? start > 0 : previous.skipping,
    mtime: stat.mtimeMs,
    bootstrapping: reset || previous?.bootstrapping,
    snapshot: reset ? undefined : previous?.snapshot,
  };
  const fd = openSync(path, "r");
  const records: { entry: Record<string, unknown>; offset: number }[] = [];
  try {
    const buffer = Buffer.alloc(Math.min(MAX_BATCH, stat.size - start));
    const length = readSync(fd, buffer, 0, buffer.length, start);
    let from = 0;
    for (let index = 0; index < length; index++) {
      if (buffer[index] !== 10) continue;
      if (!cursor.skipping) {
        try {
          const entry = JSON.parse(buffer.subarray(from, index).toString("utf8"));
          if (entry && typeof entry === "object" && !Array.isArray(entry)) records.push({ entry, offset: start + from });
        } catch {
          /* A malformed complete record is not state evidence. */
        }
      }
      cursor.skipping = false;
      from = index + 1;
      cursor.offset = start + from;
    }
    if (!cursor.skipping && from < length && start + length === stat.size) {
      try {
        const entry = JSON.parse(buffer.subarray(from, length).toString("utf8"));
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          records.push({ entry, offset: start + from });
          cursor.offset = stat.size;
          from = length;
        }
      } catch {
        /* Wait for the rest of a partial final record. */
      }
    }
    // Bound memory even if one tool output is many megabytes. Never parse its suffix as JSON.
    if (from === 0 && length === MAX_BATCH) {
      cursor.offset = start + length;
      cursor.skipping = true;
    }
    // Finish skipping an oversized EOF record even before its newline is flushed.
    // Keep skipping=true so a later suffix cannot be mistaken for a fresh record.
    if (cursor.skipping && from === 0 && start + length === stat.size) cursor.offset = stat.size;
  } finally {
    closeSync(fd);
  }
  return { records, cursor, reset, atEnd: cursor.offset === stat.size };
}

export class TranscriptCollector {
  private lookups = new Map<string, number>();
  constructor(
    private readonly engine: EventEngine,
    private readonly adapters: () => Adapter[],
    private readonly onError: (message: string) => void = () => {},
  ) {}

  async poll(): Promise<void> {
    const adapters = new Map(this.adapters().map((adapter) => [adapter.id, adapter]));
    for (const session of await this.engine.store.subscribed()) {
      const adapter = adapters.get(session.agent);
      const source = adapter?.source?.transcript;
      if (!source) continue;
      const key = `${session.agent}:${session.sessionId}`;
      try {
        let path = session.transcriptPath;
        if (!path || !readable(path)) {
          if (Date.now() - (this.lookups.get(key) ?? 0) < 30000) continue;
          this.lookups.set(key, Date.now());
          path = (await adapter?.source?.locateTranscript?.(session)) ?? "";
        }
        if (!path) continue;
        if (path !== session.transcriptPath) await this.engine.store.attachTranscript(session.agent, session.sessionId, path);
        const cursorKey = `transcript:v2:${key}:${path}`;
        let previous = await this.engine.store.readCursor<TranscriptCursor>(cursorKey);
        // Bootstrap subscribed history in bounded chunks so an old, still unanswered async
        // question is not lost behind a large recent tool result. No historical notification burst.
        for (let chunk = 0; chunk < 32; chunk++) {
          const batch = readTranscriptBatch(path, previous, true);
          let snapshot = batch.cursor.snapshot;
          for (const { entry, offset } of batch.records) {
            for (const [index, event] of source.parse(entry, session, batch.cursor.context).entries()) {
              const normalized: AgentEvent = {
                ...event,
                transcriptPath: path,
                eventId: createHash("sha256")
                  .update(`${cursorKey}:${batch.cursor.identity}:${offset}:${index}:${JSON.stringify(entry)}`)
                  .digest("hex"),
              };
              if (batch.cursor.bootstrapping) snapshot = applyEvent(snapshot, normalized)?.next ?? snapshot;
              else await this.engine.ingest(normalized);
            }
          }
          if (batch.cursor.bootstrapping && batch.atEnd) {
            if (snapshot?.state)
              await this.engine.ingest(
                {
                  agent: session.agent,
                  sessionId: session.sessionId,
                  type: "snapshot",
                  snapshot: snapshot.state,
                  snapshotComplete: true,
                  host: session.host === "app" ? "app" : snapshot.host,
                  at: snapshot.state.at,
                  turnId: snapshot.state.turnId,
                  source: "transcript",
                  transcriptPath: path,
                  summary: snapshot.summary,
                  eventId: `snapshot:${cursorKey}:${batch.cursor.identity}:${batch.cursor.offset}:${batch.cursor.mtime}`,
                },
                { silent: true },
              );
            batch.cursor.bootstrapping = false;
            batch.cursor.snapshot = undefined;
          } else if (batch.cursor.bootstrapping) batch.cursor.snapshot = snapshot;
          await this.engine.store.writeCursor(cursorKey, batch.cursor);
          const advanced = batch.cursor.offset !== previous?.offset;
          previous = batch.cursor;
          if (batch.atEnd || !advanced) break;
        }
      } catch (error) {
        this.onError(`collector ${key}: ${String(error)}`);
      }
    }
  }
}

function readable(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
