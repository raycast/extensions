import {
  acquireLock,
  deleteSessionByFile,
  getDb,
  heartbeatLock,
  loadAllStates,
  loadRefs,
  releaseLock,
  setMeta,
  writeSession,
} from "./db";
import { resolveRepo } from "./git";
import { seenLinearWorkspaces } from "./refs";
import { providers } from "./providers";
import { DiscoveredFile, ProviderContext, SessionState } from "./types";

export interface IndexProgress {
  done: number;
  total: number;
  file: string;
}

export interface IndexSummary {
  scanned: number;
  indexed: number;
  removed: number;
  durationMs: number;
}

const ctx: ProviderContext = {
  resolveRepo,
  existingRefs: (sessionId) => loadRefs(sessionId),
};

/**
 * Incremental indexing:
 *  - unchanged (same size + mtime)            -> skip
 *  - grew (append-only logs)                  -> parse from the stored byte offset, keep old messages
 *  - shrank / rewritten / never seen          -> full re-parse
 *  - file gone                                -> delete
 * The "lock" meta key keeps the periodic background refresh and the UI from indexing concurrently.
 */
export async function refreshIndex(
  opts: { onProgress?: (p: IndexProgress) => void; signal?: AbortSignal } = {},
): Promise<IndexSummary> {
  const started = Date.now();
  const lock = acquireLock();
  if (!lock) return { scanned: 0, indexed: 0, removed: 0, durationMs: 0 };
  try {
    const existing = loadAllStates();
    const discovered: DiscoveredFile[] = [];
    for (const p of providers) {
      await p.prepare();
      discovered.push(...(await p.discover()));
    }
    const seen = new Set<string>();
    const work: { file: DiscoveredFile; previous: SessionState | null; append: boolean }[] = [];
    for (const f of discovered) {
      seen.add(f.file);
      const prev = existing.get(f.file);
      if (prev && prev.fileSize === f.size && prev.fileMtime === f.mtime) continue;
      const append = !!prev && !prev.hidden && f.size > prev.indexedBytes && prev.indexedBytes > 0;
      work.push({ file: f, previous: append ? prev : null, append });
    }
    let removed = 0;
    for (const file of existing.keys()) {
      if (!seen.has(file)) {
        deleteSessionByFile(file);
        removed++;
      }
    }
    // Newest first so a fresh index becomes useful quickly.
    work.sort((a, b) => b.file.mtime - a.file.mtime);
    let indexed = 0;
    for (let i = 0; i < work.length; i++) {
      if (opts.signal?.aborted) break;
      const { file, previous, append } = work[i];
      const provider = providers.find((p) => p.id === file.agent);
      if (!provider) continue;
      try {
        const result = await provider.parse(file, previous, ctx);
        if (!append) deleteSessionByFile(file.file);
        writeSession(result.state, result.messages, result.refs, append);
        indexed++;
      } catch (e) {
        console.error(`index failed for ${file.file}`, e);
      }
      if (opts.onProgress && (i % 10 === 0 || i === work.length - 1)) {
        opts.onProgress({ done: i + 1, total: work.length, file: file.file });
      }
      if (i % 25 === 0) await new Promise((r) => setImmediate(r));
      if (i % 100 === 0) heartbeatLock(lock);
    }
    if (indexed > 0 || removed > 0) {
      setMeta("lastIndexedAt", String(Date.now()));
      const ws = [...seenLinearWorkspaces.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (ws) setMeta("linearWorkspace", ws);
      if (indexed > 200) {
        try {
          getDb().exec(`INSERT INTO messages_fts(messages_fts) VALUES('optimize')`);
        } catch {
          // optional
        }
      }
    }
    return { scanned: discovered.length, indexed, removed, durationMs: Date.now() - started };
  } finally {
    releaseLock(lock);
  }
}
