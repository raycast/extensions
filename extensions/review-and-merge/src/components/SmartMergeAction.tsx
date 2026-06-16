import { Action, Icon } from "@raycast/api";
import { PullRequest } from "../github/types";
import { enableAutoMerge } from "../github/enableAutoMerge";
import { confirmAndMerge } from "../github/mergePullRequest";
import { primaryMergeAction } from "../lib/primaryMergeAction";

interface Props {
  pr: PullRequest;
  onRefresh: () => void;
}

export function SmartMergeAction({ pr, onRefresh }: Props) {
  const action = primaryMergeAction(pr);

  if (action === "merge") {
    return (
      <Action
        title="Merge"
        icon={Icon.ArrowDownCircle}
        onAction={() => confirmAndMerge(pr, onRefresh)}
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
