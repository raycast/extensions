import { getPreferenceValues } from "@raycast/api";
import { resolveWorkspacePath } from "./workspace";

export interface ResolvedPrefs {
  workspaceRoot: string;
  globalSkillsDir: string;
}

/**
 * Read Raycast preferences and resolve `~` / paths.
 * Throws AppError if workspaceRoot is missing or unresolvable.
 */
export function getPrefs(): ResolvedPrefs {
  const raw = getPreferenceValues<Preferences>();
  return {
    workspaceRoot: resolveWorkspacePath(raw.workspaceRoot),
    globalSkillsDir: raw.globalSkillsDir?.trim() || "~/.agents/skills",
  };
}
