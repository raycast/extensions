import { useCachedPromise, type MutatePromise } from "@raycast/utils";
import { checkForUpdates, getInstalledSkillsWithLock } from "../utils/installed-skills";
import { type InstalledSkill } from "../shared";

export type MutateSkills = MutatePromise<InstalledSkill[] | undefined>;

async function fetchSkillsWithUpdateStatus(): Promise<InstalledSkill[]> {
  const [skills, updatable] = await Promise.all([
    getInstalledSkillsWithLock(),
    checkForUpdates().catch((): string[] => []),
  ]);
  const updatableSet = new Set(updatable);
  return skills.map((skill) => ({ ...skill, hasUpdate: updatableSet.has(skill.name) }));
}

export function useInstalledSkills() {
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(fetchSkillsWithUpdateStatus, [], {
    keepPreviousData: true,
  });

  return {
    skills: data ?? [],
    isLoading,
    error,
    revalidate,
    mutate,
  };
}
