import { installSkill } from "../utils/skills-cli";

type Input = {
  /** Skill display name (e.g. "Apollo Client") — from the `name` field in search results */
  name: string;
  /** GitHub owner/repo (e.g. "apollographql/skills") — from the `source` field in search results */
  source: string;
  /** Skill identifier (e.g. "apollo-client") — from the `skillId` field in search results */
  skillId: string;
  /** Comma-separated agent display names to install for (e.g. "Claude Code, Cursor"). Ask the user which agents they want before calling. Omit or pass an empty string to install for all agents. */
  agents?: string;
};

/** Install a skill from the skills.sh marketplace. Only call this after the user has confirmed they want to install. Ask which agents to install for unless the user said "all". */
export default async function tool(input: Input) {
  const agents = input.agents
    ? input.agents
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : undefined;
  await installSkill(
    {
      id: `${input.source}@${input.skillId}`,
      name: input.name,
      skillId: input.skillId,
      source: input.source,
      installs: 0,
    },
    agents,
  );
  return { success: true, installedSkill: input.name, agents: agents ?? "all" };
}
