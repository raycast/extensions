import { type Skill, type SkillFrontmatter, parseFrontmatter } from "../shared";

type SkillContentResult = {
  frontmatter: SkillFrontmatter;
  body: string;
};

export function buildSkillContentUrls(skill: Skill) {
  const owner = skill.source.split("/")[0];
  const ownerPrefix = owner.split("-")[0] + "-";
  const skillIdWithoutPrefix = skill.skillId.startsWith(ownerPrefix)
    ? skill.skillId.slice(ownerPrefix.length)
    : skill.skillId;

  const skillPaths = [
    `skills/${skill.skillId}/SKILL.md`,
    `${skill.skillId}/SKILL.md`,
    `skills/${skillIdWithoutPrefix}/SKILL.md`,
    `${skillIdWithoutPrefix}/SKILL.md`,
    `skills/${skill.name}/SKILL.md`,
    `${skill.name}/SKILL.md`,
  ];

  const branches = ["main", "master"];

  return {
    skillUrls: branches.flatMap((branch) =>
      skillPaths.map((path) => `https://raw.githubusercontent.com/${skill.source}/${branch}/${path}`),
    ),
    readmeUrls: branches.map((branch) => `https://raw.githubusercontent.com/${skill.source}/${branch}/README.md`),
  };
}

export async function fetchSkillContent(skill: Skill): Promise<SkillContentResult | undefined> {
  const { skillUrls, readmeUrls } = buildSkillContentUrls(skill);

  const fetchUrl = async (url: string) => {
    const response = await fetch(url);
    if (response.ok && !response.headers.get("content-type")?.includes("text/html")) {
      const text = await response.text();
      return parseFrontmatter(text);
    }
    throw new Error(`Failed to fetch ${url}`);
  };

  try {
    return await Promise.any(skillUrls.map((url) => fetchUrl(url)));
  } catch {
    // All SKILL.md attempts failed, fall back to README.md.
  }

  try {
    return await Promise.any(readmeUrls.map((url) => fetchUrl(url)));
  } catch {
    return undefined;
  }
}
