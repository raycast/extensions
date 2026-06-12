import { Action, Icon } from "@raycast/api";
import { ENABLE_AUTO_MERGE, MERGE_PULL_REQUEST } from "../github/queries";
import { PullRequest } from "../github/types";
import { runMutation } from "../github/runMutation";
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
        onAction={() =>
          runMutation(
            "Enabling auto-merge…",
            `Auto-merge enabled on ${label}`,
            ENABLE_AUTO_MERGE,
            { prId: pr.id, method: pr.defaultMergeMethod },
            onRefresh,
          )
        }
      />
    );
  }

  return null;
}
