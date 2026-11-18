import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { sessionKeyOfSource } from "../index/keys";
import { createMetaCache, scanWithCache, type ScanCandidate, type ScanResult } from "../index/meta-cache";
import { warn } from "../logger";
import type { ClaudeAppSessionFile } from "../types";
import { extractTitleFromFile } from "./title";
import { encodeClaudeProjectDir } from "./claude-cli";
import { pathExists, readJsonFile, safeMtimeMs, safeStat } from "./util";

interface ClaudeAppCandidate {
  appMeta: ClaudeAppSessionFile;
  metaPath: string;
  convoPath: string;
}

/**
 * Load metadata for Claude Desktop app sessions.
 * Walks `~/Library/Application Support/Claude/claude-code-sessions/<user>/<workspace>/local_*.json`
 * and resolves each entry's conversation jsonl in `~/.claude/projects/<encoded-cwd>/<cliSessionId>.jsonl`.
 *
 * Sessions whose conversation jsonl can't be located are still surfaced (so they appear in the list),
 * but their content/search will be empty.
 */
export async function loadClaudeAppSessionMetas(opts: { cacheDir: string }): Promise<ScanResult> {
  const cache = createMetaCache(opts.cacheDir, "claude-app");
  const homeDir = os.homedir();
  const appSessionsDir = path.join(homeDir, "Library", "Application Support", "Claude", "claude-code-sessions");
  const projectsDir = path.join(homeDir, ".claude", "projects");

  if (!(await pathExists(appSessionsDir))) return { metas: [], changedKeys: [], removedKeys: [] };

  const metaFiles: string[] = [];
  try {
    // Two levels deep: <user>/<workspace>/local_*.json
    for (const userDir of await fs.promises.readdir(appSessionsDir)) {
      const userPath = path.join(appSessionsDir, userDir);
      try {
        if (!(await fs.promises.stat(userPath)).isDirectory()) continue;
      } catch {
        continue;
      }

      for (const workspaceDir of await fs.promises.readdir(userPath)) {
        const workspacePath = path.join(userPath, workspaceDir);
        try {
          if (!(await fs.promises.stat(workspacePath)).isDirectory()) continue;
        } catch {
          continue;
        }

        try {
          for (const entry of await fs.promises.readdir(workspacePath)) {
            if (entry.startsWith("local_") && entry.endsWith(".json")) {
              metaFiles.push(path.join(workspacePath, entry));
            }
          }
        } catch {
          continue;
        }
      }
    }
  } catch (e) {
    warn("failed to scan Claude app sessions dir:", e);
    return { metas: [], changedKeys: [], removedKeys: [] };
  }

  const candidates: ScanCandidate<ClaudeAppCandidate>[] = [];

  for (const metaPath of metaFiles) {
    const appMeta = await readJsonFile<ClaudeAppSessionFile>(metaPath);
    if (!appMeta) continue;

    const cliSessionId = appMeta.cliSessionId;
    const cwd = appMeta.cwd || appMeta.originCwd || "";

    // Resolve the conversation jsonl. Without cliSessionId+cwd we can't locate it.
    let convoPath = "";
    if (cliSessionId && cwd) {
      const candidate = path.join(projectsDir, encodeClaudeProjectDir(cwd), `${cliSessionId}.jsonl`);
      if (await pathExists(candidate)) convoPath = candidate;
    }

    const st = await safeStat(metaPath);
    if (!st) continue;

    const id = cliSessionId || appMeta.sessionId;
    candidates.push({
      key: sessionKeyOfSource("claude-app", id),
      filePath: convoPath || metaPath,
      fileMtime: st.mtimeMs,
      fileSize: st.size,
      meta: {
        id,
        title: "",
        source: "claude-app",
        projectPath: cwd,
        timestamp: 0,
        filePath: convoPath || metaPath,
        prUrl: appMeta.prUrl,
        prNumber: appMeta.prNumber,
      },
      ctx: { appMeta, metaPath, convoPath },
    });
  }

  return scanWithCache(cache, candidates, async (c) => {
    const { appMeta, metaPath, convoPath } = c.ctx;

    // Some sessions write a title via the app ("Session 222" placeholder when titleSource=auto).
    // Prefer real titles; for auto/placeholder, fall back to first message extraction.
    let title = appMeta.title?.trim() || "";
    const looksPlaceholder = !title || /^Session\s+\d+$/i.test(title);
    if (looksPlaceholder && convoPath) {
      const fromContent = (await extractTitleFromFile(convoPath, "claude")).title;
      if (fromContent && fromContent !== "Untitled Session") title = fromContent;
    }
    if (!title) title = "Untitled Session";

    const convoMtime = convoPath ? await safeMtimeMs(convoPath) : 0;
    const timestamp = appMeta.lastActivityAt || appMeta.createdAt || convoMtime || (await safeMtimeMs(metaPath));

    return { ...c.meta, title, timestamp };
  });
}
