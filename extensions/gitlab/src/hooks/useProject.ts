import { useState, useEffect } from "react";
import { User, Label, Milestone } from "../gitlabapi";
import { gitlab } from "../common";
import { getErrorMessage } from "../utils";

export interface ProjectInfo {
  members: User[];
  labels: Label[];
  milestones: Milestone[];
}

export function useProject(query?: string): {
  projectinfo?: ProjectInfo;
  errorProjectInfo?: string;
  isLoadingProjectInfo: boolean;
} {
  const [projectinfo, setProjectInfo] = useState<ProjectInfo>();
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

          if (!didUnmount) {
            setProjectInfo({ ...projectinfo, members: members, labels: labels, milestones: milestones });
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
