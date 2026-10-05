import { getInstalledSkillsWithLock } from "../utils/installed-skills";

/** List all locally installed skills with their agents, source, and install dates. */
export default async function tool() {
  const skills = await getInstalledSkillsWithLock();
  return { skills };
}
