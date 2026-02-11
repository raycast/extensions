import { Color, Icon, List } from "@raycast/api";
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
    return {
      icon: { source: "pull-request-merged.svg", tintColor: Color.Purple },
      text: "Merged",
      color: Color.Purple,
    };
  }

  if (pullRequest.closed) {
    return {
      icon: { source: "pull-request-closed.svg", tintColor: Color.Red },
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

  if (pullRequest.isInMergeQueue) {
    return {
      icon: { source: "pull-request-merge-queue.svg", tintColor: Color.Orange },
      text: "In Merge Queue",
      color: Color.Orange,
    };
  }

  return {
    icon: { source: "pull-request-open.svg", tintColor: Color.Green },
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

      return { id: "id" in reviewer ? reviewer.id : "", ...getGitHubUser({ name, login, avatarUrl }) };
    }
  });

  const reviews = uniqBy(
    pullRequest.reviews?.nodes?.map((review) => {
      return { id: review?.author?.id, ...getGitHubUser(review?.author) };
    }),
    "id",
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
      return { icon: Icon.Check, tooltip: "Checks: Success" };
    case "ERROR":
    case "FAILURE":
      return { icon: Icon.Xmark, tooltip: "Checks: Failure" };
    case "PENDING":
      return { icon: Icon.Clock, tooltip: "Checks: Pending" };
    default:
      return null;
  }
}

export function getReviewDecision(reviewDecision?: PullRequestReviewDecision | null): List.Item.Accessory | null {
  switch (reviewDecision) {
    case "REVIEW_REQUIRED":
      return { tag: { value: "Review required" } };
    case "CHANGES_REQUESTED":
      return { tag: { value: "Changes requested" } };
    case "APPROVED":
      return {
        tag: { value: "Approved" },
      };
    default:
      return null;
  }
}

export const PR_SORT_TYPES_TO_QUERIES = [
  { title: "Newest", value: "sort:created-desc" },
  { title: "Oldest", value: "sort:created-asc" },
  { title: "Most Commented", value: "sort:comments-desc" },
  { title: "Least Commented", value: "sort:comments-asc" },
  { title: "Recently Updated", value: "sort:updated-desc" },
  { title: "Least Recently Updated", value: "sort:updated-asc" },
  { title: "Best Match", value: "sort:relevance-desc" },
  { title: "👍", value: "sort:reactions-+1-desc" },
  { title: "👎", value: "sort:reactions--1-desc" },
  { title: "😄", value: "sort:reactions-smile-desc" },
  { title: "🎉", value: "sort:reactions-tada-desc" },
  { title: "🙁", value: "sort:reactions-thinking_face-desc" },
  { title: "❤️", value: "sort:reactions-heart-desc" },
  { title: "🚀", value: "sort:reactions-rocket-desc" },
  { title: "👀", value: "sort:reactions-eyes-desc" },
];
export const PR_DEFAULT_SORT_QUERY = "sort:updated-desc";
