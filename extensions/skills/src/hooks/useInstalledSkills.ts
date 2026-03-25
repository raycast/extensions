import { useCachedPromise } from "@raycast/utils";
import { listInstalledSkills, checkForUpdates, readSkillLock } from "../utils/skills-cli";
import { stripGitSuffix } from "../shared";

async function fetchSkillsWithUpdateStatus() {
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
