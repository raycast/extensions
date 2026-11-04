import { homedir } from "node:os";
import { join } from "node:path";

export const HOME = homedir();
export const ROOT = process.env.AGENT_INBOX_HOME || join(HOME, ".sessions");
export const DB_PATH = join(ROOT, "db.sqlite");
export const CONFIG_PATH = join(ROOT, "config.json");
export const BIN_DIR = join(ROOT, "bin");
export const CLI_PATH = join(BIN_DIR, "agent-inbox.mjs");
export const ADAPTERS_DIR = join(ROOT, "adapters");
export const CACHE_DIR = join(ROOT, "cache");
export const LOG_PATH = join(ROOT, "log.txt");

export const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(HOME, ".claude");
export const CLAUDE_PROJECTS = join(CLAUDE_DIR, "projects");
export const CLAUDE_SETTINGS = join(CLAUDE_DIR, "settings.json");
export const CLAUDE_DESKTOP_SESSIONS =
  process.env.AGENT_INBOX_CLAUDE_DESKTOP_ROOT ||
  join(HOME, "Library", "Application Support", "Claude", "claude-code-sessions");

export const CODEX_DIR = process.env.CODEX_HOME || join(HOME, ".codex");
export const CODEX_SESSIONS = join(CODEX_DIR, "sessions");
export const CODEX_CONFIG = join(CODEX_DIR, "config.toml");
export const CODEX_HOOKS = join(CODEX_DIR, "hooks.json");
export const CODEX_SESSION_INDEX = join(CODEX_DIR, "session_index.jsonl");

/** Replace the home directory with ~ for display. */
export function tildify(p: string): string {
  if (!p) return p;
  return p === HOME ? "~" : p.startsWith(HOME + "/") ? "~" + p.slice(HOME.length) : p;
}

export function projectName(cwd: string): string {
  if (!cwd) return "";
  const parts = cwd.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || cwd;
}
