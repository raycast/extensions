import { sessionKeyOf, sessionKeyOfSource } from "../index/keys";
import type { SessionMeta, SessionSource } from "../types";
import { loadClaudeAppSessionMetas } from "./claude-app";
import { loadClaudeCliSessionMetas } from "./claude-cli";
import { loadCodexSessionMetas } from "./codex";

export type { ScanResult } from "../index/meta-cache";

export interface SessionLoadResult {
  metas: SessionMeta[];
  /** Stable keys (`claude:<id>` / `codex:<id>`) whose file changed or is new — content index must rebuild these segments. */
  changedKeys: string[];
  /** Stable keys that are no longer on disk — content index must drop these segments. */
  removedKeys: string[];
}

/**
 * Load all session metas from every source, sorted by recency, using per-source
 * mtime+size incremental caches under `cacheDir`.
 *
 * Deduplication: a Claude Desktop app session reuses the underlying CLI conversation jsonl
 * (`cliSessionId` → `~/.claude/projects/<encoded>/<id>.jsonl`). When both sources surface
 * the same id, the app entry wins because it carries richer metadata (true title, PR link,
 * activity timestamp). Codex CLI vs App is also keyed by id but currently lives in disjoint
 * sets — we still dedupe to be safe.
 */
export async function loadAllSessionMetas(opts: { cacheDir: string }): Promise<SessionLoadResult> {
  const [claudeCli, claudeApp, codex] = await Promise.all([
    loadClaudeCliSessionMetas(opts),
    loadClaudeAppSessionMetas(opts),
    loadCodexSessionMetas(opts),
  ]);

  const merged = new Map<string, SessionMeta>();
  const changed = new Set<string>();
  const removed = new Set<string>();

  for (const r of [claudeCli, claudeApp, codex]) {
    for (const k of r.changedKeys) changed.add(k);
    for (const k of r.removedKeys) removed.add(k);
  }

  // Insert in order of *increasing* precedence so the last writer wins.
  for (const m of claudeCli.metas) merged.set(sessionKeyOfSource("claude-cli", m.id), m);
  for (const m of claudeApp.metas) merged.set(sessionKeyOfSource("claude-app", m.id), m);

  for (const m of codex.metas) {
    const key = sessionKeyOf(m);
    const existing = merged.get(key);
    // If both sources somehow saw the same id, prefer codex-app over codex-cli.
    if (!existing || m.source === "codex-app") merged.set(key, m);
  }

  const metas = [...merged.values()].sort((a, b) => b.timestamp - a.timestamp);
  return { metas, changedKeys: [...changed], removedKeys: [...removed] };
}

export function familyOfSource(source: SessionSource): "claude" | "codex" {
  return source === "claude-cli" || source === "claude-app" ? "claude" : "codex";
}
