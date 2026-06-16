import { Action, Icon } from "@raycast/api";
import { PullRequest } from "../github/types";
import { canApprove } from "../lib/canApprove";
import { approvePullRequest } from "../github/approvePullRequest";

interface Props {
  pr: PullRequest;
  viewerLogin: string | undefined;
  onRefresh: () => void;
}

export function ApproveAction({ pr, viewerLogin, onRefresh }: Props) {
  if (!canApprove(pr, viewerLogin)) {
    return null;
  }

  return (
    <Action
      title="Approve"
      icon={Icon.CheckCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={() => approvePullRequest(pr, onRefresh)}
    />
  );
}
