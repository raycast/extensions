import {
  GithubPullRequestState,
  GithubPullRequestReviewDecision,
  GithubCheckConclusionState,
  GithubPullRequest,
  GithubCommitChecks,
  GithubCheckStatusState,
  GithubCheckSuite,
} from "../types";
import { GithubPullRequestPreview } from "../preview/GithubPullRequestPreview";
import { NotificationActions } from "../../../action/NotificationActions";
import { getGithubActorAccessory } from "../accessories";
import { Notification } from "../../../notification";
import { Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { Page } from "../../../types";

interface GithubPullRequestNotificationListItemProps {
  notification: Notification;
  githubPullRequest: GithubPullRequest;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

export function GithubPullRequestNotificationListItem({
  notification,
  githubPullRequest,
  mutate,
}: GithubPullRequestNotificationListItemProps) {
  const subtitle = `${githubPullRequest.head_repository?.name_with_owner} #${githubPullRequest.number}`;

  const author = getGithubActorAccessory(githubPullRequest.author);
  const prChecks = getGithubPullRequestChecksAccessory(githubPullRequest.latest_commit);
  const review = getGithubPullRequestReviewAccessory(githubPullRequest.review_decision);
  const prStatus = getGithubPullRequestStateAccessory(githubPullRequest);

  const accessories: List.Item.Accessory[] = [
    author,
    {
      date: new Date(githubPullRequest.updated_at),
      tooltip: `Updated at ${githubPullRequest.updated_at}`,
    },
  ];

  if (prStatus) {
    accessories.unshift(prStatus);
  }
  if (githubPullRequest.comments_count > 0) {
    accessories.unshift({
      text: githubPullRequest.comments_count.toString(),
      icon: Icon.Bubble,
      tooltip: `${githubPullRequest.comments_count} comments`,
    });
  }
  if (review) {
    accessories.unshift(review);
  }
  if (prChecks) {
    accessories.unshift(prChecks);
  }

  return (
    <List.Item
      key={notification.id}
      title={notification.title}
      icon={{ source: { light: "github-logo-dark.svg", dark: "github-logo-light.svg" } }}
      accessories={accessories}
      subtitle={subtitle}
      actions={
        <NotificationActions
          notification={notification}
          detailsTarget={<GithubPullRequestPreview notification={notification} githubPullRequest={githubPullRequest} />}
          mutate={mutate}
        />
      }
    />
  );
}

function getGithubPullRequestChecksAccessory(latestCommit: GithubCommitChecks): List.Item.Accessory | null {
  const progress = computePullRequestChecksProgress(latestCommit.check_suites);
  if (!progress) {
    return null;
  }
  switch (progress.status()) {
    case GithubCheckStatusState.Pending:
      return { icon: Icon.Pause, tooltip: "Pending" };
    case GithubCheckStatusState.InProgress:
      return { icon: Icon.CircleProgress, tooltip: "In progress" };
    case GithubCheckStatusState.Completed:
      switch (progress.conclusion()) {
        case GithubCheckConclusionState.Success:
          return { icon: Icon.CheckCircle, tooltip: "Success" };
        case GithubCheckConclusionState.Failure:
          return { icon: Icon.XMarkCircle, tooltip: "Failure" };
        default:
          return { icon: Icon.QuestionMarkCircle, tooltip: "Neutral" };
      }
    default:
      return { icon: Icon.QuestionMarkCircle, tooltip: "Neutral" };
  }
}

class GithubChecksProgress {
  checksCount = 0;
  completedChecksCount = 0;
  failedChecksCount = 0;

  status(): GithubCheckStatusState {
    if (this.completedChecksCount === 0) {
      return GithubCheckStatusState.Pending;
    }
    if (this.completedChecksCount === this.checksCount) {
      return GithubCheckStatusState.Completed;
    }
    return GithubCheckStatusState.InProgress;
  }

  conclusion(): GithubCheckConclusionState {
    if (this.status() === GithubCheckStatusState.InProgress) {
      return GithubCheckConclusionState.Neutral;
    }
    if (this.failedChecksCount > 0) {
      return GithubCheckConclusionState.Failure;
    }
    return GithubCheckConclusionState.Success;
  }
}

function computePullRequestChecksProgress(checkSuites?: Array<GithubCheckSuite>): GithubChecksProgress | null {
  if (checkSuites) {
    const progress = new GithubChecksProgress();

    for (const checkSuite of checkSuites) {
      if (checkSuite.status !== GithubCheckStatusState.Queued) {
        for (const checkRun of checkSuite.check_runs) {
          progress.checksCount += 1;
          if (checkRun.status === GithubCheckStatusState.Completed) {
            progress.completedChecksCount += 1;
            if (checkRun.conclusion && checkRun.conclusion !== GithubCheckConclusionState.Success) {
              progress.failedChecksCount += 1;
            }
          }
        }
      }
    }

    if (progress.checksCount === 0) {
      return null;
    }

    return progress;
  }
  return null;
}

function getGithubPullRequestReviewAccessory(
  reviewDecision?: GithubPullRequestReviewDecision,
): List.Item.Accessory | null {
  switch (reviewDecision) {
    case GithubPullRequestReviewDecision.Approved:
      return { tag: { value: "Approved", color: Color.Green } };
    case GithubPullRequestReviewDecision.ChangesRequested:
      return { tag: { value: "Changes requested", color: Color.Red } };
    case GithubPullRequestReviewDecision.ReviewRequired:
      return { tag: { value: "Review required", color: Color.Orange } };
    default:
      return null;
  }
}

function getGithubPullRequestStateAccessory(githubPullRequest: GithubPullRequest): List.Item.Accessory | null {
  switch (githubPullRequest.state) {
    case GithubPullRequestState.Open:
      if (githubPullRequest.is_draft) {
        return {
          icon: {
            source: "github-pullrequest-draft.svg",
            tintColor: Color.SecondaryText,
          },
        };
      }
      return {
        icon: { source: "github-pullrequest.svg", tintColor: Color.Green },
      };
    case GithubPullRequestState.Closed:
      return {
        icon: {
          source: "github-pullrequest-closed.svg",
          tintColor: Color.SecondaryText,
        },
      };
    case GithubPullRequestState.Merged:
      return {
        icon: { source: "github-pullrequest.svg", tintColor: Color.Magenta },
      };
    default:
      return null;
  }
}
