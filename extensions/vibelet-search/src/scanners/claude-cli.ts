import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { sessionKeyOfSource } from "../index/keys";
import { createMetaCache, scanWithCache, type ScanCandidate, type ScanResult } from "../index/meta-cache";
import { warn } from "../logger";
import type { ClaudeSessionIndexFile } from "../types";
import { extractTitleFromFile } from "./title";
import { pathExists, readJsonFile, safeStat } from "./util";

interface ClaudeCliCandidate {
  indexEntry?: ClaudeSessionIndexFile;
}

export async function loadClaudeCliSessionMetas(opts: { cacheDir: string }): Promise<ScanResult> {
  const cache = createMetaCache(opts.cacheDir, "claude-cli");
  const homeDir = os.homedir();
  const sessionsDir = path.join(homeDir, ".claude", "sessions");
  const projectsDir = path.join(homeDir, ".claude", "projects");

  // Build map of sessionId -> session index file (for cwd + start timestamp)
  const sessionIndex = new Map<string, ClaudeSessionIndexFile>();
  if (await pathExists(sessionsDir)) {
    try {
      for (const file of await fs.promises.readdir(sessionsDir)) {
        if (!file.endsWith(".json")) continue;
        const meta = await readJsonFile<ClaudeSessionIndexFile>(path.join(sessionsDir, file));
        if (meta?.sessionId) sessionIndex.set(meta.sessionId, meta);
      }
    } catch (e) {
      warn("failed to read ~/.claude/sessions:", e);
    }
  }

  if (!(await pathExists(projectsDir))) return { metas: [], changedKeys: [], removedKeys: [] };

  const candidates: ScanCandidate<ClaudeCliCandidate>[] = [];

  try {
    for (const projDir of await fs.promises.readdir(projectsDir)) {
      const projPath = path.join(projectsDir, projDir);
      try {
        if (!(await fs.promises.stat(projPath)).isDirectory()) continue;
      } catch {
        continue;
      }

      let jsonlFiles: string[];
      try {
        jsonlFiles = (await fs.promises.readdir(projPath)).filter((f) => f.endsWith(".jsonl"));
      } catch (e) {
        warn(`failed to read claude project dir ${projDir}:`, e);
        continue;
      }

      for (const jsonlFile of jsonlFiles) {
        const sessionId = jsonlFile.replace(".jsonl", "");
        const filePath = path.join(projPath, jsonlFile);
        const st = await safeStat(filePath);
        if (!st) continue; // file vanished mid-scan

        const indexEntry = sessionIndex.get(sessionId);
        candidates.push({
          key: sessionKeyOfSource("claude-cli", sessionId),
          filePath,
          fileMtime: st.mtimeMs,
          fileSize: st.size,
          meta: {
            id: sessionId,
            title: "",
            source: "claude-cli",
            projectPath: indexEntry?.cwd || "",
            timestamp: 0,
            filePath,
          },
          ctx: { indexEntry },
        });
      }
    }
  } catch (e) {
    warn("failed to scan ~/.claude/projects:", e);
  }

  return scanWithCache(cache, candidates, async (c) => {
    const { title, timestamp, cwd } = await extractTitleFromFile(c.filePath, "claude");
    const firstMsgEpoch = timestamp ? new Date(timestamp).getTime() : NaN;
    const ts = c.ctx.indexEntry?.startedAt ?? (Number.isFinite(firstMsgEpoch) ? firstMsgEpoch : c.fileMtime);
    return {
      ...c.meta,
      title,
      timestamp: ts,
      // Priority: session index cwd > cwd embedded in JSONL > "" (skip cd in resume cmd).
      // We don't fall back to the encoded dir name — it's lossy (each non-alnum char → `-`),
      // so decoding "-Users-bytedance-personal-midscene-10" produces a path that doesn't exist.
      projectPath: c.meta.projectPath || cwd,
    };
  });
}

/**
 * Encode a project cwd into Claude's projects/<encoded> directory name.
 *
 * Verified by inspecting existing `~/.claude/projects/` directories:
 * each unsafe character (anything outside [A-Za-z0-9-]) is replaced with a
 * single `-`, **without collapsing runs** — so `/.claude` → `--claude`
 * (two dashes, one from `/`, one from `.`).
 */
export function encodeClaudeProjectDir(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9-]/g, "-");
}
