import { usePromise, useCachedPromise } from "@raycast/utils";
import { Group, Milestone } from "../gitlabapi";
import { gitlab } from "../common";

export function useMilestones(groupId?: number): {
  milestoneInfo?: Milestone[];
  isLoadingMilestoneInfo: boolean;
} {
  const { data: groups } = useCachedPromise(() => gitlab.getGroups(), [], { initialData: [] });

  const { data, isLoading } = usePromise(
    async (id: number, groupList: Group[]): Promise<Milestone[]> => {
      const group = groupList.find((candidate) => candidate.id === id);
      return group ? await gitlab.getGroupMilestones(group) : [];
    },
    [groupId ?? 0, groups],
    {
      execute: !!groupId && groupId > 0 && !!groups,
    },
  );

  return {
    milestoneInfo: data,
    isLoadingMilestoneInfo: isLoading,
  };
}
