import { getPreferenceValues } from "@raycast/api";
import { readSkill } from "../lib/skills";

type Input = {
  /** Skill name (e.g. frontend-design) */
  name: string;
  /** Optional max characters to return (default 100000). Only set this, if you see a truncation warning. */
  maxChars?: number;
};

/** Read the full content of a specific skill. REQUIRED before using any skill. */
export default function tool(input: Input) {
  const prefs = getPreferenceValues<{ skillsDirectory: string }>();
  const root = prefs.skillsDirectory;
  if (!root) throw new Error("Skills directory not configured. Open extension preferences to set it.");
  const { content, skill, files } = readSkill(root, input.name, input.maxChars);
  return { content, skill: { name: skill.name, dir: skill.dir }, files };
}
