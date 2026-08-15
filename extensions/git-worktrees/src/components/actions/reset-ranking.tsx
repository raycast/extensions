import { getPreferences } from "#/helpers/raycast";
import { withToast } from "#/helpers/toast";
import { Action, Icon } from "@raycast/api";

export const ResetRanking = ({
  resetRankingRepo,
  resetWorktreeRanking,
}: {
  resetRankingRepo?: () => void;
  resetWorktreeRanking?: () => void;
}) => {
  const { enableProjectsFrequencySorting } = getPreferences();

  if (!enableProjectsFrequencySorting) return null;

  return (
    <>
      {!!resetRankingRepo && (
        <Action
          title="Reset Repo Ranking"
          icon={Icon.ArrowCounterClockwise}
          onAction={withToast({
            action: resetRankingRepo,
            onSuccess: () => `Successfully reset repo ranking`,
            onFailure: () => `Failed to reset repo ranking`,
          })}
        />
      )}

      {!!resetWorktreeRanking && (
        <Action
          title="Reset Worktree Ranking"
          icon={Icon.ArrowCounterClockwise}
          onAction={withToast({
            action: resetWorktreeRanking,
            onSuccess: () => `Successfully reset worktrees ranking`,
            onFailure: () => `Failed to reset worktrees ranking`,
          })}
        />
      )}
    </>
  );
};
