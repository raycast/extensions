import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { sessionKeyOf } from "../index/keys";
import {
  createMetaCache,
  scanWithCache,
  type CachedSessionMeta,
  type ScanCandidate,
  type ScanResult,
} from "../index/meta-cache";
import { readJsonlUntil } from "../load-messages";
import { warn } from "../logger";
import type { CodexConversationLine, CodexIndexLine } from "../types";
import { extractTitleFromFile } from "./title";
import { pathExists, safeStat } from "./util";

/** Marker that the Codex desktop app writes in `payload.originator` of session_meta. */
const CODEX_APP_ORIGINATOR = "Codex Desktop";

/**
 * Codex session_meta lines can be large (sometimes >15 KB) because the legacy format embeds
 * the full system instructions inline. Read enough bytes so a normal session_meta is captured;
 * pathologically huge first lines (> CODEX_META_READ_BYTES) are skipped with a warning.
 */
const CODEX_META_READ_BYTES = 256 * 1024;

/**
 * Read the first JSONL line of a Codex session file to extract id/cwd/timestamp.
 * Returns `null` if the line can't be parsed or doesn't carry session metadata.
 */
export function parseCodexSessionMetaLine(parsed: CodexConversationLine): {
  id: string;
  projectPath: string;
  ts: number;
  originator?: string;
} | null {
  // New format: { type: "session_meta", payload: { id, cwd, originator, ... } }
  if (parsed.type === "session_meta" && parsed.payload?.id) {
    return {
      id: parsed.payload.id,
      projectPath: parsed.payload.cwd || "",
      ts: parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0,
      originator: parsed.payload.originator,
    };
  }

  // Old format: { id, timestamp, instructions, git? } — no `type` field, no originator
  if (parsed.id && parsed.timestamp && !parsed.type) {
    return {
      id: parsed.id,
      projectPath: parsed.git?.cwd || "",
      ts: new Date(parsed.timestamp).getTime(),
    };
  }

  return null;
}

async function readCodexSessionMeta(
  filePath: string,
): Promise<{ id: string; projectPath: string; ts: number; originator?: string } | null> {
  const lines = await readJsonlUntil(filePath, CODEX_META_READ_BYTES, () => true);
  if (lines.length === 0) return null;
  return parseCodexSessionMetaLine(lines[0] as CodexConversationLine);
}

interface CodexCandidate {
  metaLine: { id: string; projectPath: string; ts: number; originator?: string };
  indexInfo?: { name: string; updatedAt: string };
}

/** Walk a directory tree and return all `.jsonl` file paths. */
export async function walkJsonlFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (e) {
    warn(`failed to read directory ${dir}:`, e);
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonlFiles(fullPath)));
    } else if (entry.name.endsWith(".jsonl")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Load only metadata for all Codex sessions.
 *
 * Incremental: the source of a session (cli vs desktop app) comes from the first line's
 * `originator`, which requires reading that line — but only for files whose fingerprint
 * changed. Unchanged files are reused straight from the cache.
 */
export async function loadCodexSessionMetas(opts: { cacheDir: string }): Promise<ScanResult> {
  const cache = createMetaCache(opts.cacheDir, "codex");
  const homeDir = os.homedir();
  const codexDir = path.join(homeDir, ".codex");
  const indexPath = path.join(codexDir, "session_index.jsonl");
  const sessionsDir = path.join(codexDir, "sessions");

  if (!(await pathExists(codexDir))) return { metas: [], changedKeys: [], removedKeys: [] };

  // Build title index from session_index.jsonl (only covers a subset of sessions)
  const titleMap = new Map<string, { name: string; updatedAt: string }>();
  if (await pathExists(indexPath)) {
    try {
      const content = await fs.promises.readFile(indexPath, "utf-8");
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as CodexIndexLine;
          titleMap.set(parsed.id, { name: parsed.thread_name, updatedAt: parsed.updated_at });
        } catch (e) {
          warn("failed to parse codex index line:", e);
        }
      }
    } catch (e) {
      warn("failed to read codex session_index.jsonl:", e);
    }
  }

  if (!(await pathExists(sessionsDir))) return { metas: [], changedKeys: [], removedKeys: [] };

  // Pre-index cached entries by filePath so unchanged files skip reading their meta line.
  const cached = cache.load();
  const byPath = new Map<string, CachedSessionMeta>();
  for (const [, e] of cached) byPath.set(e.meta.filePath, e);

  const candidates: ScanCandidate<CodexCandidate>[] = [];

  for (const filePath of await walkJsonlFiles(sessionsDir)) {
    const st = await safeStat(filePath);
    if (!st) continue;

    const hit = byPath.get(filePath);
    if (hit && hit.fileMtime === st.mtimeMs && hit.fileSize === st.size) {
      // Reuse cached meta without re-reading the session_meta line.
      candidates.push({
        key: sessionKeyOf(hit.meta),
        filePath,
        fileMtime: st.mtimeMs,
        fileSize: st.size,
        meta: hit.meta,
        ctx: {
          metaLine: { id: hit.meta.id, projectPath: hit.meta.projectPath, ts: hit.meta.timestamp },
        },
      });
      continue;
    }

    const metaLine = await readCodexSessionMeta(filePath);
    if (!metaLine) continue;

    const source = metaLine.originator === CODEX_APP_ORIGINATOR ? "codex-app" : "codex-cli";
    candidates.push({
      key: sessionKeyOf({ source, id: metaLine.id }),
      filePath,
      fileMtime: st.mtimeMs,
      fileSize: st.size,
      meta: {
        id: metaLine.id,
        title: "",
        source,
        projectPath: metaLine.projectPath,
        timestamp: 0,
        filePath,
      },
      ctx: { metaLine, indexInfo: titleMap.get(metaLine.id) },
    });
  }

  return scanWithCache(cache, candidates, async (c) => {
    const title = c.ctx.indexInfo?.name || (await extractTitleFromFile(c.filePath, "codex")).title;
    const timestamp = c.ctx.indexInfo ? new Date(c.ctx.indexInfo.updatedAt).getTime() : c.ctx.metaLine.ts;
    return { ...c.meta, title, timestamp };
  });
}
