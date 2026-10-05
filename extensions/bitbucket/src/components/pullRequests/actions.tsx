import { Action, Color, Icon, Toast, showToast } from "@raycast/api";

import {
  addPullRequestComment,
  approvePullRequest,
  declinePullRequest,
  requestChangesOnPullRequest,
  unapprovePullRequest,
  undoRequestChangesOnPullRequest,
} from "./../../queries";
import { PullRequest } from "./interface";
import { PullRequestDetail } from "./pullRequestDetail";
import { ReasonForm } from "./reasonForm";
import { ReviewState } from "./../../helpers/reviewState";

// Approve and Request Changes are mutually exclusive on a PR: clear whichever
// opposite state is locally set before/after the primary action. Best-effort —
// the primary action already succeeded, so a failure here doesn't fail the whole thing.
async function clearOppositeReviewState(
  pr: PullRequest,
  current: ReviewState,
  opposite: "approved" | "changes_requested",
) {
  if (current !== opposite) {
    return;
  }
  try {
    if (opposite === "approved") {
      await unapprovePullRequest(pr.repo.slug, pr.id);
    } else {
      await undoRequestChangesOnPullRequest(pr.repo.slug, pr.id);
    }
  } catch {
    // ignore — see comment above
  }
}

export function ApprovePullRequestAction(props: {
  pr: PullRequest;
  reviewState: ReviewState;
  onReviewStateChange: (next: ReviewState) => void;
}) {
  if (props.pr.state !== "OPEN") {
    return null;
  }

  const { pr, reviewState, onReviewStateChange } = props;
  const isApproved = reviewState === "approved";

  return (
    <Action
      title={isApproved ? "Unapprove Pull Request" : "Approve Pull Request"}
      icon={{
        source: isApproved ? Icon.XMarkCircle : Icon.CheckCircle,
        tintColor: isApproved ? Color.Red : Color.Green,
      }}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "a" },
        Windows: { modifiers: ["ctrl", "shift"], key: "a" },
      }}
      onAction={async () => {
        try {
          if (isApproved) {
            await unapprovePullRequest(pr.repo.slug, pr.id);
            await showToast({ style: Toast.Style.Success, title: "Pull request unapproved" });
            onReviewStateChange(null);
          } else {
            await approvePullRequest(pr.repo.slug, pr.id);
            await clearOppositeReviewState(pr, reviewState, "changes_requested");
            await showToast({ style: Toast.Style.Success, title: "Pull request approved" });
            onReviewStateChange("approved");
          }
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: isApproved ? "Failed to unapprove pull request" : "Failed to approve pull request",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }}
    />
  );
}

export function DeclinePullRequestAction(props: { pr: PullRequest; onDeclined?: () => void }) {
  if (props.pr.state !== "OPEN") {
    return null;
  }

  return (
    <Action.Push
      title="Decline Pull Request"
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "d" },
        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
      }}
      target={
        <ReasonForm
          title="Decline Pull Request"
          description="Optionally add a reason. It will be posted as a comment on the pull request."
          onSubmit={async (reason) => {
            try {
              await declinePullRequest(props.pr.repo.slug, props.pr.id);
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to decline pull request",
                message: error instanceof Error ? error.message : "Unknown error",
              });
              return;
            }

            await showToast({ style: Toast.Style.Success, title: "Pull request declined" });
            props.onDeclined?.();

            if (reason.trim().length > 0) {
              try {
                await addPullRequestComment(props.pr.repo.slug, props.pr.id, reason);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Pull request declined, but failed to post comment",
                  message: error instanceof Error ? error.message : "Unknown error",
                });
              }
            }
          }}
        />
      }
    />
  );
}

export function RequestChangesAction(props: {
  pr: PullRequest;
  reviewState: ReviewState;
  onReviewStateChange: (next: ReviewState) => void;
}) {
  if (props.pr.state !== "OPEN") {
    return null;
  }

  const { pr, reviewState, onReviewStateChange } = props;
  const isRequested = reviewState === "changes_requested";

  if (isRequested) {
    return (
      <Action
        title="Undo Request Changes"
        icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "r" },
          Windows: { modifiers: ["ctrl", "shift"], key: "r" },
        }}
        onAction={async () => {
          try {
            await undoRequestChangesOnPullRequest(pr.repo.slug, pr.id);
            await showToast({ style: Toast.Style.Success, title: "Undid request changes" });
            onReviewStateChange(null);
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to undo request changes",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }}
      />
    );
  }

  return (
    <Action.Push
      title="Request Changes"
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "r" },
        Windows: { modifiers: ["ctrl", "shift"], key: "r" },
      }}
      target={
        <ReasonForm
          title="Request Changes"
          description="Optionally add a reason. It will be posted as a comment on the pull request."
          onSubmit={async (reason) => {
            try {
              await requestChangesOnPullRequest(pr.repo.slug, pr.id);
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to request changes",
                message: error instanceof Error ? error.message : "Unknown error",
              });
              return;
            }

            await clearOppositeReviewState(pr, reviewState, "approved");
            await showToast({ style: Toast.Style.Success, title: "Requested changes" });
            onReviewStateChange("changes_requested");

            if (reason.trim().length > 0) {
              try {
                await addPullRequestComment(pr.repo.slug, pr.id, reason);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Requested changes, but failed to post comment",
                  message: error instanceof Error ? error.message : "Unknown error",
                });
              }
            }
          }}
        />
      }
    />
  );
}

export function ShowPullRequestDetailAction(props: {
  pr: PullRequest;
  onDeclined?: () => void;
  onDone?: (reviewState: ReviewState) => void;
}) {
  return (
    <Action.Push
      title="Show Pull Request Details"
      icon={{ source: Icon.Sidebar, tintColor: Color.PrimaryText }}
      target={<PullRequestDetail pr={props.pr} onDeclined={props.onDeclined} onDone={props.onDone} />}
    />
  );
}
