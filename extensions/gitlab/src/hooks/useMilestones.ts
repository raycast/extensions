import { useState, useEffect } from "react";
import { Milestone } from "../gitlabapi";
import { gitlab } from "../common";
import { getErrorMessage } from "../utils";
import { useCache } from "../cache";

export function useMilestones(grpId?: number): {
  milestoneInfo?: Milestone[];
  errorMilestoneInfo?: string;
  isLoadingMilestoneInfo: boolean;
} {
  const [milestoneInfo, setMilestoneInfo] = useState<Milestone[]>();
  const [errorMilestoneInfo, setError] = useState<string>();
  const [isLoadingMilestoneInfo, setIsLoading] = useState<boolean>(false);

  const cachedGroups = useCache("user_groups", async () => await gitlab.getGroups(), { deps: [] });
  const { data: groups } = cachedGroups;

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (!grpId || didUnmount || !groups) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        if (grpId > 0) {
          console.log(`get groupinfo for group id '${grpId}'`);
          const group = groups?.find((g) => g.id === grpId);
          const milestones = group ? await gitlab.getGroupMilestones(group) : [];

          if (!didUnmount) {
            setMilestoneInfo(milestones);
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
  }, [grpId, groups]);

  return { milestoneInfo, errorMilestoneInfo, isLoadingMilestoneInfo };
}
