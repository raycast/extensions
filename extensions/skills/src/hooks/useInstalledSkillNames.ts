import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { listInstalledSkills } from "../utils/skills-cli";

async function fetchInstalledSkillNames(): Promise<string[]> {
  const skills = await listInstalledSkills();
  return skills.map((s) => s.name);
}

export function useInstalledSkillNames() {
  const { data, isLoading } = useCachedPromise(fetchInstalledSkillNames, [], {
    keepPreviousData: true,
  });

  const installedNames = useMemo(() => new Set(data ?? []), [data]);

  return {
    installedNames,
    isLoading,
  };
}
