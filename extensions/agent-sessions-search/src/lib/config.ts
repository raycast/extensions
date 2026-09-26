import { homedir } from "node:os";
import { AgentId } from "./types";

/**
 * Configuration shared by the extension process and the index worker process.
 * The worker cannot import @raycast/api, so everything it needs is passed explicitly
 * (as JSON: keep this structure serialisable).
 */
export interface IndexConfig {
  dbPath: string;
  /** Root directory of each agent's local state, keyed by agent id. */
  homes: Record<string, string>;
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

/** Root directory of one agent's local state (see `AGENTS` in agents.ts). */
export function homeOf(id: AgentId): string {
  return getConfig().homes[id] ?? "";
}

export function expandHome(p: string): string {
  return p.replace(/^~(?=$|\/)/, homedir());
}
