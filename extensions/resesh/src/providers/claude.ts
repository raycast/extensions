import type { Dirent } from "fs";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import path from "path";
import type { ProjectInfo, SessionSearchResult } from "../types";
import { collectMessage, getProjectLabel, streamJsonl } from "../utils";
import type { MessageCollector } from "../utils";
import type { SessionProvider } from "./types";
import { WSL_PREFIX, buildWslKey, execWsl, listWslDistros, parseWslFilter, streamWslFiles, wslEnabled } from "./wsl";

const PROJECTS_DIR = path.join(homedir(), ".claude", "projects");

// ----- WSL shell scripts (Claude-specific paths & structure) -----

const WSL_DISCOVER_SCRIPT = [
  'base="$HOME/.claude/projects"',
  '[ -d "$base" ] || exit 0',
  'for dir in "$base"/*/; do',
  '[ -d "$dir" ] || continue',
  'dname=$(basename "$dir")',
  'first=$(find "$dir" -maxdepth 1 -name "*.jsonl" -print -quit 2>/dev/null)',
  '[ -z "$first" ] && continue',
  'cwd=$(grep -m1 \'"cwd"\' "$first" | sed \'s/.*"cwd" *: *"//;s/".*//\')',
  'printf "%s\\t%s\\n" "$dname" "${cwd:-}"',
  "done",
].join("\n");

const WSL_SESSION_SCAN_SCRIPT = [
  'base="$HOME/.claude/projects"',
  '[ -d "$base" ] || exit 0',
  'FILTER="$1"',
  'for dir in "$base"/*/; do',
  '[ -d "$dir" ] || continue',
  'dname=$(basename "$dir")',
  '[ -n "$FILTER" ] && [ "$dname" != "$FILTER" ] && continue',
  'for f in "$dir"*.jsonl; do',
  '[ -f "$f" ] || continue',
  'sid=$(basename "$f" .jsonl)',
  'mt=$(stat -c %Y "$f" 2>/dev/null || echo 0)',
  'printf "\\tFILE\\t%s\\t%s\\t%s\\n" "$dname" "$sid" "$mt"',
  'cat "$f"',
  'printf "\\n"',
  "done",
  "done",
].join("\n");

// ----- JSONL record helpers -----

export function isRealUserPrompt(content: string): boolean {
  return (
    !content.startsWith("<command-name>") &&
    !content.startsWith("<command-message>") &&
    !content.startsWith("<local-command") &&
    !content.startsWith("<task-notification")
  );
}

export function isUserMessage(rec: Record<string, unknown>): boolean {
  return (
    rec.type === "user" &&
    !rec.isMeta &&
    typeof (rec.message as Record<string, unknown>)?.content === "string" &&
    isRealUserPrompt((rec.message as Record<string, unknown>).content as string)
  );
}

function getUserContent(rec: Record<string, unknown>): string {
  return (rec.message as { content: string }).content;
}

export function getFirstTextBlock(content: unknown[]): string | null {
  for (const block of content) {
    if (typeof block === "object" && block !== null && "type" in block && "text" in block) {
      const b = block as { type: string; text: string };
      if (b.type === "text" && typeof b.text === "string") {
        return b.text;
      }
    }
  }
  return null;
}

export function processRecord(
  rec: Record<string, unknown>,
  state: { cwd: string | null; customTitle: string | null; gitBranch: string | null },
  collector: MessageCollector,
  query: string | null,
  lowerQuery: string | null,
) {
  if (!state.cwd && rec.cwd) state.cwd = rec.cwd as string;
  if (!state.gitBranch && rec.gitBranch) state.gitBranch = rec.gitBranch as string;
  if (rec.type === "custom-title" && rec.customTitle) state.customTitle = rec.customTitle as string;

  if (isUserMessage(rec)) {
    collectMessage(collector, getUserContent(rec), "user", (rec.timestamp as string) ?? null, query, lowerQuery);
  }

  if (rec.type === "assistant" && Array.isArray((rec.message as Record<string, unknown>)?.content)) {
    const text = getFirstTextBlock((rec.message as { content: unknown[] }).content);
    if (text) {
      collectMessage(collector, text, "assistant", (rec.timestamp as string) ?? null, query, lowerQuery);
    }
  }
}

export function buildResult(
  state: { cwd: string | null; customTitle: string | null; gitBranch: string | null },
  collector: MessageCollector,
  sessionId: string,
  projectDir: string,
  mtime: number,
  wslDistro?: string,
): SessionSearchResult | null {
  if (!state.cwd) return null;
  return {
    session: {
      sessionId,
      projectDir,
      projectPath: state.cwd,
      projectLabel: getProjectLabel(state.cwd),
      customTitle: state.customTitle,
      firstUserPrompt: collector.firstUserPrompt,
      lastModified: mtime,
      gitBranch: state.gitBranch,
      wslDistro,
    },
    matchCount: collector.matchCount,
    matches: collector.matches,
    preview: collector.preview,
  };
}

// ----- Native (file-based) helpers -----

async function readCwd(filePath: string): Promise<string | null> {
  let result: string | null = null;
  await streamJsonl(filePath, (rec, close) => {
    if (rec.cwd) {
      result = rec.cwd as string;
      close();
    }
  });
  return result;
}

async function parseSessionFile(
  filePath: string,
  sessionId: string,
  projectDir: string,
  mtime: number,
  query: string | null,
): Promise<SessionSearchResult | null> {
  const state = { cwd: null as string | null, customTitle: null as string | null, gitBranch: null as string | null };
  const collector: MessageCollector = { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
  const lowerQuery = query?.toLowerCase() ?? null;

  await streamJsonl(filePath, (rec) => processRecord(rec, state, collector, query, lowerQuery));

  return buildResult(state, collector, sessionId, projectDir, mtime);
}

async function getSessionFiles(
  projectDir: string,
  baseDir: string = PROJECTS_DIR,
): Promise<{ filePath: string; sessionId: string; mtime: number }[]> {
  const fullPath = path.join(baseDir, projectDir);
  let entries: Dirent[];
  try {
    entries = await readdir(fullPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const sessions: { filePath: string; sessionId: string; mtime: number }[] = [];
  for (const entry of entries) {
    if (!entry.name.endsWith(".jsonl") || !entry.isFile()) continue;
    const filePath = path.join(fullPath, entry.name);
    const sessionId = entry.name.replace(".jsonl", "");
    const { mtimeMs } = await stat(filePath).catch(() => ({ mtimeMs: 0 }));
    sessions.push({ filePath, sessionId, mtime: mtimeMs });
  }
  return sessions;
}

async function listProjectDirs(filter?: string | null): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries.filter((e: Dirent) => e.isDirectory() && (!filter || e.name === filter)).map((e: Dirent) => e.name);
}

// ----- Provider -----

export const claudeProvider: SessionProvider = {
  id: "claude",
  displayName: "Claude Code",
  assistantLabel: "Claude",
  searchPlaceholder: "Search Claude Code sessions...",
  emptyStateText: "No Claude Code sessions found in ~/.claude/projects",

  resumeCommand(session): string {
    if (session.wslDistro) {
      return `wsl -d ${session.wslDistro} --cd ${session.projectPath} -- bash -lic 'claude --resume ${session.sessionId}'`;
    }
    return `claude --resume ${session.sessionId}`;
  },

  async discoverProjects(): Promise<ProjectInfo[]> {
    const nativePromise = (async () => {
      const dirs = await listProjectDirs();
      const projects: ProjectInfo[] = [];

      for (const dir of dirs) {
        const fullPath = path.join(PROJECTS_DIR, dir);
        let entries: string[];
        try {
          entries = await readdir(fullPath);
        } catch {
          continue;
        }

        const firstJsonl = entries.find((e) => e.endsWith(".jsonl"));
        if (!firstJsonl) continue;

        const cwd = await readCwd(path.join(fullPath, firstJsonl));
        if (cwd) {
          projects.push({ dir, label: getProjectLabel(cwd) });
        } else {
          const segments = dir.split("-").filter(Boolean);
          projects.push({ dir, label: segments.slice(-2).join("/") });
        }
      }
      return projects;
    })();

    const wslPromise = (async () => {
      if (!wslEnabled()) return [];
      const distros = await listWslDistros();
      const projects: ProjectInfo[] = [];

      const perDistro = await Promise.all(
        distros.map(async (distro) => {
          const stdout = await execWsl(distro, WSL_DISCOVER_SCRIPT);
          return { distro, stdout };
        }),
      );
      for (const { distro, stdout } of perDistro) {
        for (const line of stdout.trim().split("\n").filter(Boolean)) {
          const idx = line.indexOf("\t");
          const dir = idx >= 0 ? line.slice(0, idx) : line;
          const cwd = idx >= 0 ? line.slice(idx + 1) : null;
          if (cwd) {
            projects.push({ dir: buildWslKey(distro, dir), label: getProjectLabel(cwd) });
          } else {
            const segments = dir.split("-").filter(Boolean);
            projects.push({
              dir: buildWslKey(distro, dir),
              label: segments.slice(-2).join("/"),
            });
          }
        }
      }
      return projects;
    })();

    const [nativeProjects, wslProjects] = await Promise.all([nativePromise, wslPromise]);
    return [...nativeProjects, ...wslProjects].sort((a, b) => a.label.localeCompare(b.label));
  },

  async searchSessions(
    query: string,
    projectFilter: string | null,
    signal?: AbortSignal,
  ): Promise<SessionSearchResult[]> {
    const isWslFilter = projectFilter?.startsWith(WSL_PREFIX);

    const nativePromise = isWslFilter
      ? Promise.resolve([])
      : (async () => {
          const projectDirs = await listProjectDirs(projectFilter);
          const results: SessionSearchResult[] = [];

          for (const projectDir of projectDirs) {
            if (signal?.aborted) break;
            const sessions = await getSessionFiles(projectDir);

            for (const { filePath, sessionId, mtime } of sessions) {
              if (signal?.aborted) break;
              const parsed = await parseSessionFile(filePath, sessionId, projectDir, mtime, query || null);
              if (!parsed) continue;
              if (query && parsed.matchCount === 0) continue;
              results.push(parsed);
            }
          }
          return results;
        })();

    const wslPromise = (async () => {
      if (!wslEnabled() || (projectFilter && !isWslFilter)) return [];
      const wslFilter = parseWslFilter(projectFilter);
      const distros = wslFilter ? [wslFilter.distro] : await listWslDistros();
      const results: SessionSearchResult[] = [];
      const lowerQuery = query ? query.toLowerCase() : null;

      await Promise.all(
        distros.map((distro) => {
          let state = {
            cwd: null as string | null,
            customTitle: null as string | null,
            gitBranch: null as string | null,
          };
          let collector: MessageCollector = { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
          let curProjectDir = "";
          let curSessionId = "";
          let curMtime = 0;

          return streamWslFiles(distro, WSL_SESSION_SCAN_SCRIPT, [wslFilter?.distro === distro ? wslFilter.dir : ""], {
            onFileStart(projectDir, sessionId, mtime) {
              state = { cwd: null, customTitle: null, gitBranch: null };
              collector = { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
              curProjectDir = projectDir;
              curSessionId = sessionId;
              curMtime = mtime;
            },
            onRecord(rec) {
              if (signal?.aborted) return;
              processRecord(rec, state, collector, query || null, lowerQuery);
            },
            onFileEnd() {
              if (signal?.aborted) return;
              const parsed = buildResult(
                state,
                collector,
                curSessionId,
                buildWslKey(distro, curProjectDir),
                curMtime,
                distro,
              );
              if (!parsed) return;
              if (query && parsed.matchCount === 0) return;
              results.push(parsed);
            },
          });
        }),
      );
      return results;
    })();

    const [nativeResults, wslResults] = await Promise.all([nativePromise, wslPromise]);
    const results = [...nativeResults, ...wslResults];
    results.sort((a, b) => b.session.lastModified - a.session.lastModified);
    return results;
  },
};
