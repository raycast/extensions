import type { Project } from "#/config/types";
import { getWorktrees } from "#/helpers/file";
import { getPreferences } from "#/helpers/raycast";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { useRef } from "react";

export const useProjectsWithWorktrees = () => {
  const { projectsPath, enableProjectsFrequencySorting } = getPreferences();

  const abortable = useRef<AbortController | undefined>(undefined);

  const {
    data: incomingData,
    isLoading,
    revalidate,
  } = useCachedPromise((searchDir) => getWorktrees(searchDir, { signal: abortable.current?.signal }), [projectsPath], {
    initialData: [],
    keepPreviousData: true,
    abortable,
  });

  let data = incomingData ?? [];
  let visitProject: ((item: Project) => Promise<void>) | undefined;
  let resetProjectRanking: ((item: Project) => Promise<void>) | undefined;

  if (enableProjectsFrequencySorting) {
    const {
      data: sortedData,
      visitItem,
      resetRanking,
    } = useFrecencySorting(data, { sortUnvisited: (a, b) => a.id.localeCompare(b.id), namespace: "repos" });

    data = sortedData;
    visitProject = visitItem;
    resetProjectRanking = resetRanking;
  }

  return {
    projects: data,
    isLoadingProjects: isLoading,
    revalidateProjects: revalidate,
    visitProject,
    resetProjectRanking,
  };
};
