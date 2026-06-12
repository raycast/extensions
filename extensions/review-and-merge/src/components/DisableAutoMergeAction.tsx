import { Action, Icon } from "@raycast/api";
import { DISABLE_AUTO_MERGE } from "../github/queries";
import { PullRequest } from "../github/types";
import { runMutation } from "../github/runMutation";

interface Props {
  pr: PullRequest;
  onRefresh: () => void;
}

export function DisableAutoMergeAction({ pr, onRefresh }: Props) {
  if (!pr.autoMergeEnabled) {
    return null;
  }

  return (
    <Action
      title="Disable Auto-Merge"
      icon={Icon.BoltDisabled}
      onAction={() =>
        runMutation(
          "Disabling auto-merge…",
          `Auto-merge disabled on ${pr.repo}#${pr.number}`,
          DISABLE_AUTO_MERGE,
          { prId: pr.id },
          onRefresh,
        )
      }
    />
  );
}
