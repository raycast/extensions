import { getPreferenceValues } from "@raycast/api";
import { listSkills } from "../lib/skills";

/** List all available skills in the user's skills directory. Call this first when the user asks what skills they have. */
export default async function tool() {
  const prefs = getPreferenceValues<{ skillsDirectory: string }>();
  const root = prefs.skillsDirectory;
  if (!root) throw new Error("Skills directory not configured. Open extension preferences to set it.");
  const skills = await listSkills(root);
  return { skills };
}
