/**
 * Standalone scanner script.
 * Runs as a child_process to avoid Raycast worker memory limits.
 * Reads all JSONL session files, extracts token usage via chunk-based regex,
 * and writes results to the usage cache file.
 *
 * Usage: node scanner.js [afterDateMs]
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { calculateEntryCost } from "./pricing";
import { getProjectName, resolveProjectPath } from "./session-parser";
import {
  RE_INPUT_TOKENS,
  RE_OUTPUT_TOKENS,
  RE_CACHE_READ,
  RE_CACHE_CREATION,
  RE_MODEL,
  RE_TYPE_ASSISTANT,
  RE_TYPE_USER,
  RE_GIT_BRANCH,
  sumAllMatches,
  countMatches,
  lastMatch,
} from "./jsonl-utils";

const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");
const CACHE_FILE = path.join(
  os.homedir(),
  ".claude",
  "claude-code-monitor",
  "usage-cache.json",
);

interface CacheEntry {
  mtime: number;
  turnCount: number;
  cost: number;
  model?: string;
  summary: string;
  firstMessage: string;
  gitBranch?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  id?: string;
  projectPath: string;
  projectName: string;
}

async function main() {
  const afterDateMs = parseInt(process.argv[2] || "0", 10);
  const afterDate = afterDateMs ? new Date(afterDateMs) : undefined;

  // Load existing cache
  let cache: Record<string, CacheEntry> = {};
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    // No cache yet
  }

  let dirty = false;
  const dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const dirPath = path.join(PROJECTS_DIR, dir.name);

    let files: string[];
    try {
      files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".jsonl"));
    } catch {
      continue;
    }

    // Resolve project path using multi-strategy resolution
    const projectPath = await resolveProjectPath(dir.name);
    const projectName = getProjectName(projectPath);

    for (const file of files) {
      const fp = path.join(dirPath, file);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(fp);
      } catch {
        continue;
      }
      if (afterDate && stat.mtime < afterDate) continue;

      const mtimeMs = stat.mtime.getTime();
      const existing = cache[fp];
      if (existing && existing.mtime === mtimeMs) {
        // Already cached and fresh — just ensure projectPath is set
        if (!existing.projectPath) {
          existing.projectPath = projectPath;
          existing.projectName = projectName;
          dirty = true;
        }
        continue;
      }

      // Parse via chunk scan
      let inputTokens = 0,
        outputTokens = 0,
        cacheReadTokens = 0,
        cacheCreationTokens = 0;
      let model: string | undefined;
      let assistantTurns = 0,
        userTurns = 0;
      let gitBranch: string | undefined;
      let summary = "";
      let firstMessage = "";
      let id: string | undefined;

      const fd = fs.openSync(fp, "r");
      try {
        // Head: first 8KB for metadata
        const headBuf = Buffer.alloc(8192);
        const headRead = fs.readSync(fd, headBuf, 0, 8192, 0);
        const head = headBuf.toString("utf8", 0, headRead);
        for (const line of head.split("\n")) {
          if (!line.trim() || line.length > 50000) continue;
          try {
            const entry = JSON.parse(line);
            if (entry.type === "summary") {
              summary = entry.summary || "";
              id = entry.leafUuid || path.basename(fp, ".jsonl");
            }
            if (
              (entry.type === "user" || entry.type === "human") &&
              !firstMessage &&
              entry.message?.content
            ) {
              const c = entry.message.content;
              if (typeof c === "string") firstMessage = c.slice(0, 200);
              else if (Array.isArray(c)) {
                const tb = c.find((b: { type: string }) => b.type === "text");
                firstMessage = tb?.text?.slice(0, 200) || "";
              }
            }
          } catch {
            /* skip */
          }
        }

        // Chunk scan for tokens
        const CHUNK = 256 * 1024;
        const buf = Buffer.alloc(CHUNK);
        let pos = 0;
        let carry = "";
        while (pos < stat.size) {
          const bytesRead = fs.readSync(fd, buf, 0, CHUNK, pos);
          if (!bytesRead) break;
          const text = carry + buf.toString("utf8", 0, bytesRead);

          inputTokens += sumAllMatches(text, RE_INPUT_TOKENS());
          outputTokens += sumAllMatches(text, RE_OUTPUT_TOKENS());
          cacheReadTokens += sumAllMatches(text, RE_CACHE_READ());
          cacheCreationTokens += sumAllMatches(text, RE_CACHE_CREATION());
          assistantTurns += countMatches(text, RE_TYPE_ASSISTANT());
          userTurns += countMatches(text, RE_TYPE_USER());

          const m = lastMatch(text, RE_MODEL());
          if (m) model = m;

          if (!gitBranch) {
            const gb = text.match(RE_GIT_BRANCH);
            if (gb) gitBranch = gb[1];
          }

          const lastNewline = text.lastIndexOf("\n");
          carry = lastNewline >= 0 ? text.slice(lastNewline + 1) : text;
          pos += bytesRead;
        }
      } finally {
        fs.closeSync(fd);
      }

      const cost =
        model && (inputTokens || outputTokens)
          ? calculateEntryCost(model, {
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cache_read_input_tokens: cacheReadTokens,
              cache_creation_input_tokens: cacheCreationTokens,
            })
          : 0;

      cache[fp] = {
        mtime: mtimeMs,
        turnCount: userTurns + assistantTurns,
        cost,
        model,
        summary,
        firstMessage,
        gitBranch,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
        id: id || path.basename(fp, ".jsonl"),
        projectPath,
        projectName,
      };
      dirty = true;
    }
  }

  // Write cache
  if (dirty) {
    const dir = path.dirname(CACHE_FILE);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = CACHE_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(cache));
    fs.renameSync(tmp, CACHE_FILE);
  }

  // Output JSON summary to stdout
  process.stdout.write(
    JSON.stringify({ ok: true, count: Object.keys(cache).length }),
  );
}

main().catch((err) => {
  process.stderr.write(String(err));
  process.exit(1);
});
