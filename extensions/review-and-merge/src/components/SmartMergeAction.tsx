import { Action, Icon } from "@raycast/api";
import { MERGE_PULL_REQUEST } from "../github/queries";
import { PullRequest } from "../github/types";
import { runMutation } from "../github/runMutation";
import { enableAutoMerge } from "../github/enableAutoMerge";
import { primaryMergeAction } from "../lib/primaryMergeAction";

interface Props {
  pr: PullRequest;
  onRefresh: () => void;
}

export function SmartMergeAction({ pr, onRefresh }: Props) {
  const action = primaryMergeAction(pr);
  const label = `${pr.repo}#${pr.number}`;

  if (action === "merge") {
    return (
      <Action
        title="Merge"
        icon={Icon.ArrowDownCircle}
        onAction={() =>
          runMutation(
            "Merging…",
            `Merged ${label}`,
            MERGE_PULL_REQUEST,
            { prId: pr.id, method: pr.defaultMergeMethod },
            onRefresh,
          )
        }
      />
    );
  }

  if (action === "enable-auto-merge") {
    return (
      <Action
        title="Enable Auto-Merge"
        icon={Icon.Bolt}
        onAction={() => enableAutoMerge(pr, onRefresh)}
      />
    );
  }

  return null;
}
