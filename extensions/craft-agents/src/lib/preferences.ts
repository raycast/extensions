import { getPreferenceValues } from "@raycast/api";
import { z } from "zod";
import { resolveWorkspacePath } from "./workspace";

const PrefsSchema = z.object({
  workspaceRoot: z.string().optional(),
  globalSkillsDir: z.string().optional(),
});

export interface ResolvedPrefs {
  workspaceRoot: string;
  globalSkillsDir: string;
}

/**
 * Read Raycast preferences, validate, and resolve `~` / paths.
 * Throws AppError if workspaceRoot is missing or unresolvable.
 */
export function getPrefs(): ResolvedPrefs {
  const raw = getPreferenceValues<Record<string, string>>();
  const parsed = PrefsSchema.parse(raw);
  return {
    workspaceRoot: resolveWorkspacePath(parsed.workspaceRoot),
    globalSkillsDir: parsed.globalSkillsDir ?? "~/.agents/skills",
  };
}
