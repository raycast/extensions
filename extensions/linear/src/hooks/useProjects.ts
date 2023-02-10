import { groupBy, partition, uniqBy } from "lodash";
import { useMemo } from "react";

import { getProjects, MilestoneResult } from "../api/getProjects";
import { useCachedPromise } from "@raycast/utils";

export default function useProjects(teamId?: string, config?: { execute?: boolean }) {
  const { data, error, isLoading, mutate } = useCachedPromise(getProjects, [teamId], {
    execute: config?.execute !== false,
  });

  const { upcomingProjects, projectsByMilestoneId, milestones } = useMemo(() => {
    const [milestonesProjects, upcomingProjects] = partition(data, (project) => project.milestone);
    const projectsByMilestoneId = groupBy(milestonesProjects, (project) => project.milestone?.id);
    const milestones = uniqBy(
      milestonesProjects.map((project) => project.milestone),
      "id"
    ) as MilestoneResult[];
    milestones.sort((a, b) => a.sortOrder - b.sortOrder);

    return { upcomingProjects, projectsByMilestoneId, milestones };
  }, [data]);

  return {
    projects: data,
    isLoadingProjects: (!data && !error) || isLoading,
    projectsError: error,
    upcomingProjects,
    projectsByMilestoneId,
    milestones,
    mutateProjects: mutate,
  };
}
