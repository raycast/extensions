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
  const candidates = [
    `https://raw.githubusercontent.com/${source}/HEAD/${skillId}/SKILL.md`,
    `https://raw.githubusercontent.com/${source}/HEAD/skills/${skillId}/SKILL.md`,
  ];
  for (const url of candidates) {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      const truncated = text.length > MAX_CHARS;
      return { content: truncated ? text.slice(0, MAX_CHARS) + "\n\n[...truncated]" : text };
    }
  }
  throw new Error(`Could not fetch SKILL.md for ${source}@${skillId}. The skill may use a non-standard repo layout.`);
}
