import { useCachedPromise } from "@raycast/utils";
import { listInstalledSkills } from "../utils/skills-cli";

export function useInstalledSkills() {
  const { data, isLoading, error, revalidate } = useCachedPromise(listInstalledSkills, [], {
    keepPreviousData: true,
  });

  return {
    skills: data ?? [],
    isLoading,
    error,
    revalidate,
  };
}
