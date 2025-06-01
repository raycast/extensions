import type { BareRepository, Worktree } from "#/config/types";
import { getPreferences } from "#/helpers/raycast";
import { useFrecencySorting } from "@raycast/utils";
import { memo } from "react";
import { Item } from "./item";

export const List = memo(
  ({
    project,
    worktrees: incomingWorktrees,
    rankBareRepository,
    revalidateProjects,
  }: {
    project?: BareRepository;
    worktrees: Worktree[];
    rankBareRepository?: (key: "increment" | "reset") => void;
    revalidateProjects: () => void;
  }) => {
    const { enableWorktreesFrequencySorting } = getPreferences();

    let worktrees = incomingWorktrees;
    let visitWorktree: ((item: Worktree) => Promise<void>) | undefined;
    let resetWorktreeRanking: ((item: Worktree) => Promise<void>) | undefined;

    if (enableWorktreesFrequencySorting) {
      const {
        data: sortedWorktrees,
        visitItem,
        resetRanking,
      } = useFrecencySorting(worktrees, {
        sortUnvisited: (a, b) => a.id.localeCompare(b.id),
        namespace: "worktrees",
      });

      worktrees = sortedWorktrees;
      visitWorktree = visitItem;
      resetWorktreeRanking = resetRanking;
    }

    return worktrees.map((worktree) => {
      return (
        <Item
          key={worktree.id}
          project={project}
          worktree={worktree}
          rankBareRepository={rankBareRepository}
          rankWorktree={
            enableWorktreesFrequencySorting
              ? (action) => (action === "increment" ? visitWorktree?.(worktree) : resetWorktreeRanking?.(worktree))
              : undefined
          }
          revalidateProjects={revalidateProjects}
        />
      );
    });
  },
);
