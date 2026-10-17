import { useCachedPromise, type MutatePromise } from "@raycast/utils";
import { getInstalledSkillsWithUpdateStatus } from "../utils/installed-skills";
import { type InstalledSkill } from "../shared";

export type MutateSkills = MutatePromise<InstalledSkill[] | undefined>;

async function fetchSkillsWithUpdateStatus(): Promise<InstalledSkill[]> {
  return getInstalledSkillsWithUpdateStatus();
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
