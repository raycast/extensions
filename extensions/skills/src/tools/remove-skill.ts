import { removeSkill } from "../utils/skills-cli";

type Input = {
  /** Name of the skill to remove (e.g. "apollo-client") */
  skillName: string;
  /** Comma-separated agent display names to remove the skill from (e.g. "Claude Code, Cursor"). Omit or pass an empty string to remove from all agents. */
  agents?: string;
};

/** Remove an installed skill. Only call this after the user has confirmed they want to remove it. Ask which agents to remove from unless the user said "all". */
export default async function tool(input: Input) {
  const agents = input.agents
    ? input.agents
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : undefined;
  await removeSkill(input.skillName, agents);
  return { success: true, removedSkill: input.skillName, agents: agents ?? "all" };
}
