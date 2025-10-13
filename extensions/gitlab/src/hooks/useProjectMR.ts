import { useState, useEffect } from "react";
import { User, Label, Milestone, Branch, TemplateSummary } from "../gitlabapi";
import { gitlab } from "../common";
import { getErrorMessage } from "../utils";

export interface ProjectInfoMR {
  members: User[];
  labels: Label[];
  milestones: Milestone[];
  branches: Branch[];
  mergeRequestTemplates: TemplateSummary[];
}

export function useProjectMR(query?: string): {
  projectinfo?: ProjectInfoMR;
  errorProjectInfo?: string;
  isLoadingProjectInfo: boolean;
} {
  const [projectinfo, setProjectInfo] = useState<ProjectInfoMR>();
  const [errorProjectInfo, setError] = useState<string>();
  const [isLoadingProjectInfo, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const proid = parseInt(query || "0");
        if (proid > 0) {
          console.log(`get projectinfo for project id '${proid}'`);
          const members = await gitlab.getProjectMember(proid);
          const labels = await gitlab.getProjectLabels(proid);
          const milestones = await gitlab.getProjectMilestones(proid);
          const branches = ((await gitlab.fetch(`projects/${proid}/repository/branches`, {}, true)) as Branch[]) || [];
          const mergeRequestTemplates = await gitlab.getProjectMergeRequestTemplates(proid);

          if (!didUnmount) {
            setProjectInfo({
              ...projectinfo,
              members: members,
              labels: labels,
              milestones: milestones,
              branches: branches,
              mergeRequestTemplates: mergeRequestTemplates,
            });
          }
        } else {
          console.log("no project selected");
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query]);

  return { projectinfo, errorProjectInfo, isLoadingProjectInfo };
}
