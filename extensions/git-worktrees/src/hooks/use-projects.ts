import type { BareRepository } from "#/config/types";
import { findProjects } from "#/helpers/file";
import { getPreferences } from "#/helpers/raycast";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { useRef } from "react";

type ProjectItem = BareRepository & { id: string };

export const useProjects = () => {
  const { projectsPath, enableProjectsFrequencySorting } = getPreferences();

  const abortable = useRef<AbortController | undefined>(undefined);

  const {
    data: incomingData,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (searchDir) => {
      const repos = await findProjects(searchDir);
      return repos.map((repo) => ({ ...repo, id: repo.fullPath }));
    },
    [projectsPath],
    { initialData: [], keepPreviousData: true, abortable },
  );

  let data = incomingData ?? [];
  let visitProject: ((item: ProjectItem) => Promise<void>) | undefined;
  let resetProjectRanking: ((item: ProjectItem) => Promise<void>) | undefined;

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
