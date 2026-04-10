import { useCachedPromise, type MutatePromise } from "@raycast/utils";
import { listInstalledSkills, checkForUpdates, readSkillLock } from "../utils/skills-cli";
import { type InstalledSkill, stripGitSuffix } from "../shared";

export type MutateSkills = MutatePromise<InstalledSkill[] | undefined>;

async function fetchSkillsWithUpdateStatus(): Promise<InstalledSkill[]> {
  const [skills, updatable, lockEntries] = await Promise.all([
    listInstalledSkills(),
    checkForUpdates().catch(() => [] as string[]),
    readSkillLock(),
  ]);
  const updatableSet = new Set(updatable);
  return skills.map((skill) => {
    const lock = lockEntries[skill.name];
    return {
      ...skill,
      hasUpdate: updatableSet.has(skill.name),
      ...(lock && {
        source: lock.source,
        sourceUrl: lock.sourceUrl ? stripGitSuffix(lock.sourceUrl) : undefined,
        installedAt: lock.installedAt,
        updatedAt: lock.updatedAt,
      }),
    };
  });
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
