import { fetchSkillsSearch } from "../api";
import { buildInstallCommand } from "../shared";

type Input = {
  /** Natural language query describing what you're looking for (e.g. "git commit messages", "code review") */
  query: string;
  /** Maximum number of results to return (default 10) */
  limit?: number;
};

/** Search the skills.sh marketplace for agent skills. Call this first when the user asks for a skill or describes what they need. */
export default async function tool(input: Input) {
  const { query, limit = 10 } = input;
  const response = await fetchSkillsSearch(query, undefined, limit);
  return {
    skills: response.skills.map((skill) => ({
      name: skill.name,
      skillId: skill.skillId,
      source: skill.source,
      installs: skill.installs,
      installCommand: buildInstallCommand(skill),
    })),
    count: response.count,
  };
}
