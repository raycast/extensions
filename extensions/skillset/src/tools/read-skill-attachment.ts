import { getPreferenceValues } from "@raycast/api";
import { readSkillFile } from "../lib/skills";

type Input = {
  /** Skill name (e.g. frontend-design) */
  skillName: string;
  /** Relative path within skill directory (e.g. templates/daily.md) */
  filePath: string;
  /** Optional max characters to return (default 100000). Only set this, if you see a truncation warning. */
  maxChars?: number;
};

/** Read a supporting file from a skill directory (templates, examples). Use when a skill references attachments. */
export default function tool(input: Input) {
  const prefs = getPreferenceValues<{ skillsDirectory: string }>();
  const root = prefs.skillsDirectory;
  if (!root) {
    throw new Error("Skills directory not configured. Open extension preferences to set it.");
  }
  const content = readSkillFile(root, input.skillName, input.filePath, input.maxChars);
  return { content };
}
