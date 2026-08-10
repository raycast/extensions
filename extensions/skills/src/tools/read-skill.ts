import { fetchSkillContent } from "../hooks/skill-content";
import type { Skill } from "../shared";

type Input = {
  /** GitHub owner/repo of the skill (e.g. "anthropics/skills") — from the `source` field in search results */
  source: string;
  /** Skill identifier within the repo (e.g. "git-commit") — from the `skillId` field in search results */
  skillId: string;
};

const MAX_CHARS = 50_000;

/** Fetch the full SKILL.md content for a specific skill. Use after search-skills to understand what a skill does. */
export default async function tool(input: Input) {
  const { source, skillId } = input;

  // Reuses the resolver behind the skill detail view so the tool understands the
  // same repo layouts (nested folders, owner-prefixed names, single-skill repos)
  // instead of guessing at two flat paths.
  const skill: Skill = { id: `${source}/${skillId}`, skillId, name: skillId, source, installs: 0 };
  const result = await fetchSkillContent(skill);

  if (!result) {
    throw new Error(`Could not fetch SKILL.md for ${source}@${skillId}. The skill may use a non-standard repo layout.`);
  }

  const truncated = result.raw.length > MAX_CHARS;
  return { content: truncated ? result.raw.slice(0, MAX_CHARS) + "\n\n[...truncated]" : result.raw };
}
