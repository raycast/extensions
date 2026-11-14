import { removeSkill } from "../utils/skills-cli";

type Input = {
  /** Name of the skill to remove (e.g. "apollo-client") */
  skillName: string;
  /** Comma-separated verified agent display names to remove the skill from (Codex and/or Claude Code). */
  agents: string;
};

/** Remove a verified Skills CLI installation. Only call this after the user confirms the specific agents. */
export default async function tool(input: Input) {
  const agents = input.agents
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  if (!agents.length) throw new Error("Specify Codex and/or Claude Code after confirming the agents to remove from.");
  await removeSkill(input.skillName, agents);
  return { success: true, removedSkill: input.skillName, agents };
}
