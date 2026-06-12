import { Action, Icon, showToast, Toast } from "@raycast/api";
import { githubGraphql } from "../github/client";
import { APPROVE_PULL_REQUEST } from "../github/queries";
import { PullRequest } from "../github/types";
import { canApprove } from "../lib/canApprove";

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
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Approving…",
        });
        try {
          await githubGraphql(APPROVE_PULL_REQUEST, { prId: pr.id });
          toast.style = Toast.Style.Success;
          toast.title = `Approved ${pr.repo}#${pr.number}`;
          onRefresh();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Approve failed";
          toast.message =
            error instanceof Error ? error.message : String(error);
        }
      }}
    />
  );
}
