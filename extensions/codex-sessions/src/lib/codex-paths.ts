import { getPreferenceValues } from "@raycast/api";
import { executeSQL } from "@raycast/utils";
import { access, constants, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, join, resolve } from "node:path";

export interface CodexPreferences {
  codexCliPath?: string;
  terminalApp?: "Terminal" | "iTerm";
}

export function getCodexHome(): string {
  return process.env.CODEX_HOME ?? join(homedir(), ".codex");
}

export function sessionsDir(): string {
  return join(getCodexHome(), "sessions");
}

export function worktreesDir(): string {
  return join(getCodexHome(), "worktrees");
}

const probeColumns = [
  "id",
  "rollout_path",
  "created_at",
  "updated_at",
  "source",
  "thread_source",
  "cwd",
  "title",
  "first_user_message",
  "preview",
  "archived",
  "git_branch",
  "git_origin_url",
  "model",
  "tokens_used",
];

export async function discoverStateDb(): Promise<string | null> {
  let entries;
  try {
    entries = await readdir(getCodexHome(), { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = entries
    .map((entry) => {
      const match = /^state_(\d+)\.sqlite$/.exec(entry.name);
      return match && entry.isFile() ? { path: join(getCodexHome(), entry.name), version: Number(match[1]) } : null;
    })
    .filter((candidate): candidate is { path: string; version: number } => candidate !== null)
    .sort((a, b) => b.version - a.version);

  const probe = `SELECT ${probeColumns.join(", ")} FROM threads LIMIT 1`;
  for (const candidate of candidates) {
    try {
      await executeSQL(candidate.path, probe);
      return candidate.path;
    } catch {
      continue;
    }
  }
  return null;
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

function expandPath(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return resolve(path);
}

export async function resolveCodexBinary(): Promise<string | null> {
  let preferences: CodexPreferences = {};
  try {
    preferences = getPreferenceValues<CodexPreferences>();
  } catch {
    preferences = {};
  }

  const configured = preferences.codexCliPath?.trim();
  if (configured) {
    const path = expandPath(configured);
    if (await isExecutable(path)) return path;
  }

  const candidates = [
    join(homedir(), ".local/bin/codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    join(homedir(), ".cargo/bin/codex"),
  ];
  for (const candidate of candidates) {
    if (await isExecutable(candidate)) return candidate;
  }

  for (const directory of (process.env.PATH || "").split(delimiter)) {
    if (!directory) continue;
    const candidate = join(directory, "codex");
    if (await isExecutable(candidate)) return candidate;
  }
  return null;
}
