import type { Dirent } from "fs";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import path from "path";
import type { ProjectInfo, SessionSearchResult } from "../types";
import { collectMessage, getProjectLabel, streamJsonl } from "../utils";
import type { MessageCollector } from "../utils";
import type { SessionProvider } from "./types";
import { WSL_PREFIX, buildWslKey, execWsl, listWslDistros, parseWslFilter, streamWslFiles, wslEnabled } from "./wsl";

const SESSIONS_DIR = path.join(homedir(), ".codex", "sessions");
const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/;

// ----- WSL shell scripts (Codex-specific paths & structure) -----

const WSL_DISCOVER_SCRIPT = [
  'base="$HOME/.codex/sessions"',
  '[ -d "$base" ] || exit 0',
  'find "$base" -name "*.jsonl" -type f 2>/dev/null | while read f; do',
  '  cwd=$(grep -m1 \'"session_meta"\' "$f" | sed \'s/.*"cwd" *: *"//;s/".*//\')',
  '  [ -n "$cwd" ] && printf "%s\\n" "$cwd"',
  "done | sort -u",
].join("\n");

const WSL_SESSION_SCAN_SCRIPT = [
  'base="$HOME/.codex/sessions"',
  '[ -d "$base" ] || exit 0',
  'find "$base" -name "*.jsonl" -type f 2>/dev/null | while read f; do',
  '  sid=$(basename "$f" .jsonl)',
  '  mt=$(stat -c %Y "$f" 2>/dev/null || echo 0)',
  '  printf "\\tFILE\\t\\t%s\\t%s\\n" "$sid" "$mt"',
  '  cat "$f"',
  '  printf "\\n"',
  "done",
].join("\n");

// ----- JSONL record helpers -----

export function sessionIdFromFilename(filename: string): string {
  const m = UUID_RE.exec(filename);
  return m ? m[1] : filename.replace(".jsonl", "");
}

export function isUserMessage(rec: Record<string, unknown>): boolean {
  if (rec.type !== "event_msg") return false;
  const payload = rec.payload as Record<string, unknown> | undefined;
  return payload?.type === "user_message" && typeof payload?.message === "string";
}

export function isAgentMessage(rec: Record<string, unknown>): boolean {
  if (rec.type !== "event_msg") return false;
  const payload = rec.payload as Record<string, unknown> | undefined;
  return payload?.type === "agent_message" && typeof payload?.message === "string";
}

export function processRecord(
  rec: Record<string, unknown>,
  state: { cwd: string | null; sessionId: string | null },
  collector: MessageCollector,
  query: string | null,
  lowerQuery: string | null,
) {
  if (rec.type === "session_meta") {
    const payload = rec.payload as Record<string, unknown> | undefined;
    if (payload?.cwd && !state.cwd) state.cwd = payload.cwd as string;
    if (payload?.id) state.sessionId = payload.id as string;
  }

  if (isUserMessage(rec)) {
    const content = (rec.payload as { message: string }).message;
    collectMessage(collector, content, "user", (rec.timestamp as string) ?? null, query, lowerQuery);
  }

  if (isAgentMessage(rec)) {
    const content = (rec.payload as { message: string }).message;
    collectMessage(collector, content, "assistant", (rec.timestamp as string) ?? null, query, lowerQuery);
  }
}

// ----- Native (file-based) helpers -----

async function findSessionFiles(baseDir: string): Promise<{ filePath: string; sessionId: string; mtime: number }[]> {
  const sessions: { filePath: string; sessionId: string; mtime: number }[] = [];

  async function walk(dir: string) {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith(".jsonl") && entry.isFile()) {
        const { mtimeMs } = await stat(fullPath).catch(() => ({ mtimeMs: 0 }));
        sessions.push({ filePath: fullPath, sessionId: sessionIdFromFilename(entry.name), mtime: mtimeMs });
      }
    }
  }

  await walk(baseDir);
  return sessions;
}

async function parseSessionFile(
  filePath: string,
  filenameSessionId: string,
  mtime: number,
  query: string | null,
  projectFilter: string | null,
): Promise<SessionSearchResult | null> {
  const state = { cwd: null as string | null, sessionId: filenameSessionId as string | null };
  const collector: MessageCollector = { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
  const lowerQuery = query?.toLowerCase() ?? null;
  let rejected = false;

  await streamJsonl(filePath, (rec, close) => {
    if (rejected) return;

    processRecord(rec, state, collector, query, lowerQuery);

    // Early exit if this session doesn't match the project filter
    if (rec.type === "session_meta" && projectFilter && state.cwd !== projectFilter) {
      rejected = true;
      close();
    }
  });

  if (!state.cwd || rejected) return null;

  return {
    session: {
      sessionId: state.sessionId ?? filenameSessionId,
      projectDir: state.cwd,
      projectPath: state.cwd,
      projectLabel: getProjectLabel(state.cwd),
      customTitle: null,
      firstUserPrompt: collector.firstUserPrompt,
      lastModified: mtime,
      gitBranch: null,
    },
    matchCount: collector.matchCount,
    matches: collector.matches,
    preview: collector.preview,
  };
}

// ----- Provider -----

export const codexProvider: SessionProvider = {
  id: "codex",
  displayName: "Codex CLI",
  assistantLabel: "Codex",
  searchPlaceholder: "Search Codex CLI sessions...",
  emptyStateText: "No Codex CLI sessions found in ~/.codex/sessions",

  resumeCommand(session): string {
    if (session.wslDistro) {
      return `wsl -d ${session.wslDistro} --cd ${session.projectPath} -- bash -lic 'codex resume ${session.sessionId}'`;
    }
    return `codex resume ${session.sessionId}`;
  },

  async discoverProjects(): Promise<ProjectInfo[]> {
    const nativePromise = (async () => {
      const sessions = await findSessionFiles(SESSIONS_DIR);
      const projectMap = new Map<string, string>();

      for (const { filePath } of sessions) {
        let cwd: string | null = null;
        await streamJsonl(filePath, (rec, close) => {
          if (rec.type === "session_meta") {
            const payload = rec.payload as Record<string, unknown> | undefined;
            if (payload?.cwd) {
              cwd = payload.cwd as string;
              close();
            }
          }
        });
        if (cwd && !projectMap.has(cwd)) {
          projectMap.set(cwd, getProjectLabel(cwd));
        }
      }

      const projects: ProjectInfo[] = [];
      for (const [dir, label] of projectMap) {
        projects.push({ dir, label });
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
        for (const cwd of stdout.trim().split("\n").filter(Boolean)) {
          projects.push({ dir: buildWslKey(distro, cwd), label: getProjectLabel(cwd) });
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
          const allFiles = await findSessionFiles(SESSIONS_DIR);
          const results: SessionSearchResult[] = [];

          for (const { filePath, sessionId, mtime } of allFiles) {
            if (signal?.aborted) break;
            const parsed = await parseSessionFile(filePath, sessionId, mtime, query || null, projectFilter);
            if (!parsed) continue;
            if (query && parsed.matchCount === 0) continue;
            results.push(parsed);
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
          let state = { cwd: null as string | null, sessionId: null as string | null };
          let collector: MessageCollector = { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
          let curFilenameId = "";
          let curMtime = 0;
          const cwdFilter = wslFilter?.distro === distro ? wslFilter.dir : null;

          return streamWslFiles(distro, WSL_SESSION_SCAN_SCRIPT, [], {
            onFileStart(_projectDir, sessionId, mtime) {
              state = { cwd: null, sessionId: null };
              collector = { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
              curFilenameId = sessionId;
              curMtime = mtime;
            },
            onRecord(rec) {
              if (signal?.aborted) return;
              processRecord(rec, state, collector, query || null, lowerQuery);
            },
            onFileEnd() {
              if (signal?.aborted || !state.cwd) return;
              // Filter by cwd if a WSL project filter is active
              if (cwdFilter && state.cwd !== cwdFilter) return;

              const finalSessionId = state.sessionId ?? curFilenameId;
              const result: SessionSearchResult = {
                session: {
                  sessionId: finalSessionId,
                  projectDir: buildWslKey(distro, state.cwd),
                  projectPath: state.cwd,
                  projectLabel: getProjectLabel(state.cwd),
                  customTitle: null,
                  firstUserPrompt: collector.firstUserPrompt,
                  lastModified: curMtime,
                  gitBranch: null,
                  wslDistro: distro,
                },
                matchCount: collector.matchCount,
                matches: collector.matches,
                preview: collector.preview,
              };
              if (query && result.matchCount === 0) return;
              results.push(result);
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
