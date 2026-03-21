import { useCachedPromise } from "@raycast/utils";
import { listInstalledSkills, checkForUpdates } from "../utils/skills-cli";

async function fetchSkillsWithUpdateStatus() {
  const [skills, updatable] = await Promise.all([listInstalledSkills(), checkForUpdates().catch(() => [] as string[])]);
  const updatableSet = new Set(updatable);
  return skills.map((skill) => ({
    ...skill,
    hasUpdate: updatableSet.has(skill.name),
  }));
}

export function useInstalledSkills() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchSkillsWithUpdateStatus, [], {
    keepPreviousData: true,
  });

  return {
    skills: data ?? [],
    isLoading,
    error,
    revalidate,
  };
}
