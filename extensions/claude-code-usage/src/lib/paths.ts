import os from "node:os";
import path from "node:path";
import { getPreferenceValues } from "@raycast/api";

type Prefs = { claudeDir?: string; currency?: string; usdToBrl?: string };

export function preferences(): Prefs {
  try {
    return getPreferenceValues<Prefs>();
  } catch {
    return {};
  }
}

/** Pasta que contem `.claude.json` e `projects/`. */
export function claudeHome(): string {
  const custom = preferences().claudeDir?.trim();
  if (custom) return custom;
  return process.env.CLAUDE_CONFIG_DIR?.trim() || os.homedir();
}

export function projectsDir(): string {
  return path.join(claudeHome(), ".claude", "projects");
}
