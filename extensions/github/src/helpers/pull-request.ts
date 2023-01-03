import { List, Color, Icon } from "@raycast/api";
import { uniqBy } from "lodash";

import {
  PullRequestDetailsFieldsFragment,
  PullRequestFieldsFragment,
  PullRequestReviewDecision,
  StatusState,
} from "../generated/graphql";

import { getGitHubUser } from "./users";

export function getPullRequestStatus(pullRequest: PullRequestFieldsFragment | PullRequestDetailsFieldsFragment) {
  if (pullRequest.merged) {
    return { icon: { source: "merge.svg", tintColor: Color.Purple }, text: "Merged", color: Color.Purple };
  }

  if (pullRequest.closed) {
    return {
      icon: { source: "pull-request.svg", tintColor: Color.Red },
      text: "Closed",
      color: Color.Red,
    };
  }

  if (pullRequest.isDraft) {
    return {
      icon: { source: "pull-request-draft.svg", tintColor: Color.SecondaryText },
      text: "Draft",
      color: Color.SecondaryText,
    };
  }

  return {
    icon: { source: "pull-request.svg", tintColor: Color.Green },
    text: "Open",
    color: Color.Green,
  };
}

export function getPullRequestAuthor(pullRequest: PullRequestFieldsFragment | PullRequestDetailsFieldsFragment) {
  return getGitHubUser(pullRequest.author);
}

export function getPullRequestReviewers(pullRequest: PullRequestDetailsFieldsFragment) {
  const requests = pullRequest.reviewRequests?.nodes?.map((request) => {
    const reviewer = request?.requestedReviewer;
    if (reviewer) {
      let name;
      if ("userName" in reviewer) {
        name = reviewer.userName;
      }

      if ("teamName" in reviewer) {
        name = reviewer.teamName;
      }

      let login;
      if ("githubUsername" in reviewer) {
        login = reviewer.githubUsername;
      }

      let avatarUrl;
      if ("userAvatarURL" in reviewer) {
        avatarUrl = reviewer.userAvatarURL;
      }

      if ("teamAvatarURL" in reviewer) {
        avatarUrl = reviewer.teamAvatarURL;
      }

      return { id: reviewer.id, ...getGitHubUser({ name, login, avatarUrl }) };
    }
  });

  const reviews = uniqBy(
    pullRequest.reviews?.nodes?.map((review) => {
      return { id: review?.author?.id, ...getGitHubUser(review?.author) };
    }),
    "id"
  );

  return [...(requests ?? []), ...(reviews ?? [])];
}

export function getNumberOfComments(pullRequest: PullRequestFieldsFragment) {
  const countInComments = pullRequest.comments.totalCount;

  const countInReviews =
    pullRequest.reviews?.nodes?.reduce((result, review) => {
      return result + (review?.bodyText === "" ? 0 : 1);
    }, 0) ?? 0;

  const countInReviewThreads =
    pullRequest.reviewThreads.nodes
      ?.map((thread) => thread?.comments.totalCount ?? 0)
      .reduce((result, count) => result + count, 0) ?? 0;

  return countInComments + countInReviews + countInReviewThreads;
}

export function getCheckStateAccessory(commitStatusCheckRollupState: StatusState): List.Item.Accessory | null {
  switch (commitStatusCheckRollupState) {
    case "SUCCESS":
      return { icon: { source: Icon.Check, tintColor: Color.Green }, tooltip: "Checks: Success" };
    case "ERROR":
    case "FAILURE":
      return { icon: { source: Icon.XMarkCircle, tintColor: Color.Red }, tooltip: "Checks: Failure" };
    case "PENDING":
      return { icon: { source: Icon.Clock, tintColor: Color.SecondaryText }, tooltip: "Checks: Pending" };
    default:
      return null;
  }
}

export function getReviewDecision(reviewDecision?: PullRequestReviewDecision | null): List.Item.Accessory | null {
  switch (reviewDecision) {
    case "REVIEW_REQUIRED":
      return { tag: { value: "Review requested", color: Color.Orange } };
    case "CHANGES_REQUESTED":
      return { tag: { value: "Changes requested", color: Color.Red } };
    case "APPROVED":
      return {
        tag: { value: "Approved", color: Color.Green },
      };
    default:
      return null;
  }
}
