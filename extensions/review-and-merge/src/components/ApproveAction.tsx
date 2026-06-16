import { Action, Icon } from "@raycast/api";
import { PullRequest } from "../github/types";
import { canApprove } from "../lib/canApprove";
import { approvePullRequest } from "../github/approvePullRequest";

interface Props {
  pr: PullRequest;
  viewerLogin: string | undefined;
  onRefresh: () => void;
  /** Offer Approve regardless of PR state (used by Review Requests). */
  anyState?: boolean;
}

export function ApproveAction({
  pr,
  viewerLogin,
  onRefresh,
  anyState = false,
}: Props) {
  if (!canApprove(pr, viewerLogin, { ignoreState: anyState })) {
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
