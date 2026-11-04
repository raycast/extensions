import { createReadStream } from "node:fs";
import { chmod, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";
import { listTranscriptFiles, ScanOptions, TranscriptFile } from "./history";
import { CACHE_DIR } from "./paths";
import { exec, q } from "./sqlite";
import { conversationText } from "./transcript";
import { Session } from "./types";

export const sessionKey = (s: Pick<Session, "agent" | "sessionId">) => `${s.agent}:${s.sessionId}`;

export function normalizeSearch(text: string): string {
  return text.normalize("NFKC").toLowerCase().split("\u0000").join("");
}

export function searchTerms(query: string): string[] {
  return [...new Set(normalizeSearch(query).trim().split(/\s+/).filter(Boolean))];
}

export interface ContentMatch {
  terms: string[];
  snippet: string;
}

export type ContentMatches = Record<string, ContentMatch>;

function metadata(s: Session): string {
  return normalizeSearch([s.title, s.sessionId, s.cwd].join("\n"));
}

/** Terms may match different messages, or be split between a title and dialogue. */
export function searchSessions(sessions: Session[], query: string, contents: ContentMatches = {}): Session[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return sessions;
  return sessions.filter((s) => {
    const title = metadata(s);
    const content = contents[sessionKey(s)];
    return terms.every((term) => title.includes(term) || content?.terms.includes(term));
  });
}

export interface IndexProgress {
  completed: number;
  total: number;
  updated: number;
  failed: number;
}

interface SourceRow {
  path: string;
  agent: string;
  mtime: number;
  size: number;
}

export interface SearchIndexOptions extends Pick<ScanOptions, "claudeRoot" | "codexRoot"> {
  path?: string;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * A disposable, local-only index of conversation text. Each source is streamed once on first
 * use, then only reparsed if mtime or size changes. Queries never read transcript files.
 * Trigrams accelerate substring queries (including Chinese); one/two-character terms use
 * exact substring scans. Older SQLite builds fall back to the same exact scan semantics.
 */
export class SessionSearchIndex {
  readonly path: string;
  private ready?: Promise<void>;
  private trigram = false;
  private updating: Promise<unknown> = Promise.resolve();

  constructor(private options: SearchIndexOptions = {}) {
    this.path = options.path ?? join(CACHE_DIR, "conversation-search.sqlite");
  }

  private init(): Promise<void> {
    this.ready ??= (async () => {
      await exec(this.path, `PRAGMA journal_mode=WAL;`);
      await chmod(this.path, 0o600);
      await exec(
        this.path,
        `CREATE TABLE IF NOT EXISTS sources (path TEXT PRIMARY KEY, agent TEXT NOT NULL, mtime INTEGER NOT NULL, size INTEGER NOT NULL);`,
      );
      try {
        await exec(
          this.path,
          `CREATE VIRTUAL TABLE IF NOT EXISTS documents USING fts5(path UNINDEXED, agent UNINDEXED, session_id UNINDEXED, body, tokenize='trigram');`,
        );
      } catch {
        await exec(this.path, `CREATE TABLE IF NOT EXISTS documents (path TEXT PRIMARY KEY, agent TEXT, session_id TEXT, body TEXT);`);
      }
      const rows = await exec<{ sql: string }>(this.path, `SELECT sql FROM sqlite_master WHERE name='documents';`);
      this.trigram = /USING fts5/i.test(rows[0]?.sql ?? "");
    })().catch((error) => {
      this.ready = undefined;
      throw error;
    });
    return this.ready;
  }

  update(sessions: Session[], progress: (state: IndexProgress) => void, signal?: AbortSignal): Promise<IndexProgress> {
    // Navigation/revalidation can cancel one scan and start another; writes stay sequential.
    const next = this.updating.catch(() => undefined).then(() => this.updateFiles(sessions, progress, signal));
    this.updating = next;
    return next;
  }

  private async updateFiles(sessions: Session[], progress: (state: IndexProgress) => void, signal?: AbortSignal): Promise<IndexProgress> {
    await this.init();
    signal?.throwIfAborted();
    const files = new Map(listTranscriptFiles(this.options).map((file) => [file.path, file]));
    const known = new Map(sessions.filter((s) => s.transcriptPath).map((s) => [s.transcriptPath, s]));
    for (const s of known.values()) {
      if (files.has(s.transcriptPath) || (s.agent !== "claude" && s.agent !== "codex")) continue;
      try {
        const st = await stat(s.transcriptPath);
        if (st.isFile()) files.set(s.transcriptPath, { path: s.transcriptPath, agent: s.agent, size: st.size, mtime: st.mtimeMs });
      } catch {
        // Missing files are excluded from the index and are still searchable by title.
      }
    }
    const old = new Map((await exec<SourceRow>(this.path, "SELECT path,agent,mtime,size FROM sources;")).map((row) => [row.path, row]));
    const state: IndexProgress = { completed: 0, total: files.size, updated: 0, failed: 0 };
    progress({ ...state });
    for (const file of files.values()) {
      signal?.throwIfAborted();
      const hit = old.get(file.path);
      if (!hit || hit.agent !== file.agent || hit.mtime !== Math.round(file.mtime) || hit.size !== file.size) {
        try {
          const doc = await readConversation(file, known.get(file.path)?.sessionId, signal);
          signal?.throwIfAborted();
          await exec(
            this.path,
            `BEGIN; DELETE FROM documents WHERE path=${q(file.path)}; ` +
              `INSERT INTO documents (path,agent,session_id,body) VALUES (${q(file.path)},${q(file.agent)},${q(doc.sessionId)},${q(doc.body)}); ` +
              `INSERT OR REPLACE INTO sources VALUES (${q(file.path)},${q(file.agent)},${q(Math.round(file.mtime))},${q(file.size)}); COMMIT;`,
          );
          state.updated++;
        } catch (error) {
          if (signal?.aborted) throw error;
          state.failed++;
          // A failed refresh must not silently serve stale content from this file.
          await exec(
            this.path,
            `BEGIN; DELETE FROM documents WHERE path=${q(file.path)}; DELETE FROM sources WHERE path=${q(file.path)}; COMMIT;`,
          );
        }
      }
      state.completed++;
      if (state.completed % 8 === 0 || state.completed === state.total) progress({ ...state });
    }
    const removed = [...old.keys()].filter((path) => !files.has(path));
    if (removed.length > 0) {
      const paths = removed.map(q).join(",");
      await exec(this.path, `BEGIN; DELETE FROM documents WHERE path IN (${paths}); DELETE FROM sources WHERE path IN (${paths}); COMMIT;`);
    }
    return state;
  }

  async search(query: string): Promise<ContentMatches> {
    const terms = searchTerms(query);
    if (terms.length === 0) return {};
    await this.init();
    const matches: ContentMatches = {};
    // Bounded SQL batches also support pasted queries without SQLite's compound-select limit.
    for (let start = 0; start < terms.length; start += 16) {
      const statements = terms.slice(start, start + 16).map((term, i) => {
        const literal = q(term);
        const fts = this.trigram && [...term].length >= 3 ? `body MATCH ${q('"' + term.replace(/"/g, '""') + '"')} AND ` : "";
        return `SELECT agent,session_id,${start + i} AS term,substr(body,max(1,instr(body,${literal})-50),180) AS snippet FROM documents WHERE ${fts}instr(body,${literal})>0`;
      });
      const rows = await exec<{ agent: string; session_id: string; term: number; snippet: string }>(
        this.path,
        statements.join(" UNION ALL ") + ";",
      );
      for (const row of rows) {
        const key = `${row.agent}:${row.session_id}`;
        const match = (matches[key] ??= { terms: [], snippet: row.snippet.replace(/\s+/g, " ") });
        if (!match.terms.includes(terms[row.term])) match.terms.push(terms[row.term]);
      }
    }
    return matches;
  }
}

async function readConversation(file: TranscriptFile, knownId: string | undefined, signal?: AbortSignal) {
  let sessionId = knownId ?? "";
  const texts = new Set<string>();
  const stream = createReadStream(file.path, { encoding: "utf8", signal, highWaterMark: 64 * 1024 });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  // Abort can destroy the stream after the async iterator has removed its listeners.
  // Own both error lifecycles; never re-emit onto an already closed readline interface.
  let readError: Error | undefined;
  const onReadError = (error: Error) => {
    readError ??= error;
    lines.close();
  };
  stream.on("error", onReadError);
  lines.on("error", onReadError);
  let count = 0;
  try {
    for await (const line of lines) {
      signal?.throwIfAborted();
      if (readError) throw readError;
      try {
        const record = JSON.parse(line) as Record<string, unknown>;
        if (!sessionId && file.agent === "claude" && typeof record.sessionId === "string") sessionId = record.sessionId;
        if (!sessionId && file.agent === "codex" && record.type === "session_meta") {
          const payload = record.payload as { id?: string } | undefined;
          if (typeof payload?.id === "string") sessionId = payload.id;
        }
        const text = conversationText(file.agent, record);
        if (text) texts.add(normalizeSearch(text));
      } catch {
        // An actively written final line or older malformed record does not hide valid dialogue.
      }
      // readline can deliver many buffered rows without yielding to the Raycast render loop.
      if (++count % 128 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    }
  } finally {
    lines.close();
    stream.destroy();
  }
  signal?.throwIfAborted();
  if (readError) throw readError;
  sessionId ||= file.agent === "claude" ? basename(file.path, ".jsonl") : (basename(file.path).match(UUID)?.[0] ?? "");
  if (!sessionId) throw new Error("Transcript has no session ID");
  return { sessionId, body: [...texts].join("\n") };
}
