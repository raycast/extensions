import { useCachedPromise } from "@raycast/utils";

import { type Skill } from "../shared";
import { fetchSkillContent } from "./skill-content";

/**
 * Hook to fetch and cache skill content from GitHub
 */
export function useSkillContent(skill: Skill, execute = true) {
  const { data, isLoading } = useCachedPromise((skill) => fetchSkillContent(skill), [skill], {
    keepPreviousData: true,
    execute,
  });

  return {
    content: data?.body,
    frontmatter: data?.frontmatter ?? {},
    isLoading,
  };
}
