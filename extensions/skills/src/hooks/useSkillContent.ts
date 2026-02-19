import { useCachedPromise } from "@raycast/utils";

import { type Skill, removeFrontmatter } from "../shared";

/**
 * Fetch skill content from GitHub, trying SKILL.md first, then README.md
 */
async function fetchSkillContent(skill: Skill): Promise<string | undefined> {
  // Extract owner from source and try removing prefix from skillId
  const owner = skill.source.split("/")[0];
  const ownerPrefix = owner.split("-")[0] + "-"; // "vercel-labs" -> "vercel-"
  const skillIdWithoutPrefix = skill.skillId.startsWith(ownerPrefix)
    ? skill.skillId.slice(ownerPrefix.length)
    : skill.skillId;

  // Possible paths for SKILL.md in order of priority
  const skillPaths = [
    `skills/${skill.skillId}/SKILL.md`, // Most common: anthropics/skills, vercel-labs/skills
    `${skill.skillId}/SKILL.md`, // Root-level skill directory
    `skills/${skillIdWithoutPrefix}/SKILL.md`, // Try without owner prefix (vercel-labs/agent-skills)
    `${skillIdWithoutPrefix}/SKILL.md`, // Root-level without prefix
    `skills/${skill.name}/SKILL.md`, // Using name instead of skillId
    `${skill.name}/SKILL.md`, // Name at root
  ];

  const branches = ["main", "master"];

  // Helper function to fetch a single URL
  const fetchUrl = async (url: string) => {
    const response = await fetch(url);
    if (response.ok && !response.headers.get("content-type")?.includes("text/html")) {
      const text = await response.text();
      return removeFrontmatter(text);
    }
    throw new Error(`Failed to fetch ${url}`);
  };

  // Build all possible URLs for SKILL.md
  const skillUrls = branches.flatMap((branch) =>
    skillPaths.map((path) => `https://raw.githubusercontent.com/${skill.source}/${branch}/${path}`),
  );

  // Try all SKILL.md paths in parallel
  try {
    return await Promise.any(skillUrls.map((url) => fetchUrl(url)));
  } catch {
    // All SKILL.md attempts failed, try README.md
  }

  // Fallback to README.md in parallel
  const readmeUrls = branches.map((branch) => `https://raw.githubusercontent.com/${skill.source}/${branch}/README.md`);

  try {
    return await Promise.any(readmeUrls.map((url) => fetchUrl(url)));
  } catch {
    // No content found
    return undefined;
  }
}

/**
 * Hook to fetch and cache skill content from GitHub
 */
export function useSkillContent(skill: Skill) {
  const { data: content, isLoading } = useCachedPromise((skill) => fetchSkillContent(skill), [skill], {
    keepPreviousData: true,
  });

  return {
    content,
    isLoading,
  };
}
