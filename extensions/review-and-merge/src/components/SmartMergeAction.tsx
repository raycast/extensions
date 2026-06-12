import { Action, Alert, confirmAlert, Icon } from "@raycast/api";
import { MERGE_PULL_REQUEST } from "../github/queries";
import { PullRequest } from "../github/types";
import { runMutation } from "../github/runMutation";
import { enableAutoMerge } from "../github/enableAutoMerge";
import { mergeReadiness } from "../lib/mergeReadiness";
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
        onAction={async () => {
          const readiness = mergeReadiness(pr.mergeStateStatus);
          if (readiness.kind === "confirm") {
            const confirmed = await confirmAlert({
              title: "Merge anyway?",
              message: readiness.reason,
              primaryAction: {
                title: "Merge",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (!confirmed) return;
          }
          await runMutation(
            "Merging…",
            `Merged ${label}`,
            MERGE_PULL_REQUEST,
            { prId: pr.id, method: pr.defaultMergeMethod },
            onRefresh,
          );
        }}
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
