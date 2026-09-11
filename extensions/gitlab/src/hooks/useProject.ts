import { usePromise } from "@raycast/utils";
import { User, Label, Milestone } from "../gitlabapi";
import { gitlab } from "../common";

export interface ProjectInfo {
  members: User[];
  labels: Label[];
  milestones: Milestone[];
}

export function useProject(query?: string): {
  projectinfo?: ProjectInfo;
  isLoadingProjectInfo: boolean;
} {
  const proid = parseInt(query || "0");
  const { data, isLoading } = usePromise(
    async (projectId: number): Promise<ProjectInfo> => {
      const members = await gitlab.getProjectMember(projectId);
      const labels = await gitlab.getProjectLabels(projectId);
      const milestones = await gitlab.getProjectMilestones(projectId);
      return { members, labels, milestones };
    },
    [proid],
    {
      execute: proid > 0,
    },
  );

  return {
    projectinfo: data,
    isLoadingProjectInfo: isLoading,
  };
}
