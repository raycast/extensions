import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Configuration shared by the extension process and the index worker process.
 * The worker cannot import @raycast/api, so everything it needs is passed explicitly.
 */
export interface IndexConfig {
  dbPath: string;
  claudeProjectsDir: string;
  codexHome: string;
  includeArchived: boolean;
}

let current: IndexConfig | null = null;

export function setConfig(cfg: IndexConfig) {
  current = cfg;
}

export function getConfig(): IndexConfig {
  if (!current) throw new Error("Index configuration not initialised");
  return current;
}

export function expandHome(p: string): string {
  return p.replace(/^~(?=$|\/)/, homedir());
}

export function defaultClaudeProjectsDir(override?: string): string {
  const base = override?.trim() ? expandHome(override.trim()) : join(homedir(), ".claude");
  return join(base, "projects");
}

export function defaultCodexHome(override?: string): string {
  return override?.trim() ? expandHome(override.trim()) : join(homedir(), ".codex");
}
