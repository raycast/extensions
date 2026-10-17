import { Color, Icon, List } from "@raycast/api";

import {
  CodeReviewStatus,
  GreptileComment,
  GreptileRepository,
  MergeRequest,
  PullRequestState,
} from "../types";

export function formatDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

export function formatRepository(repository?: GreptileRepository) {
  return repository?.name || "Unknown repository";
}

export function formatPullRequestNumber(number?: number) {
  return typeof number === "number" ? `#${number}` : "No PR";
}

export function pullRequestStateAccessory(
  state?: PullRequestState | string,
): List.Item.Accessory {
  switch (state) {
    case "open":
      return { tag: { value: "Open", color: Color.Green } };
    case "merged":
      return { tag: { value: "Merged", color: Color.Purple } };
    case "closed":
      return { tag: { value: "Closed", color: Color.Red } };
    default:
      return { tag: state ? String(state) : "Unknown" };
  }
}

export function codeReviewStatusAccessory(
  status?: CodeReviewStatus | string,
): List.Item.Accessory {
  switch (status) {
    case "COMPLETED":
      return { tag: { value: "Completed", color: Color.Green } };
    case "FAILED":
      return { tag: { value: "Failed", color: Color.Red } };
    case "SKIPPED":
      return { tag: { value: "Skipped", color: Color.SecondaryText } };
    case "PENDING":
      return { tag: { value: "Pending", color: Color.Yellow } };
    case "REVIEWING_FILES":
      return { tag: { value: "Reviewing", color: Color.Blue } };
    case "GENERATING_SUMMARY":
      return { tag: { value: "Summarizing", color: Color.Blue } };
    default:
      return { tag: status ? String(status) : "Unknown" };
  }
}

export function addressedAccessory(addressed?: boolean): List.Item.Accessory {
  return addressed
    ? { tag: { value: "Addressed", color: Color.Green } }
    : { tag: { value: "Unaddressed", color: Color.Orange } };
}

export function getRepositoryUrl(
  repository?: GreptileRepository,
  sourceRepoUrl?: string,
) {
  if (sourceRepoUrl) {
    return sourceRepoUrl;
  }

  if (repository?.url) {
    return repository.url;
  }

  if (repository?.remoteUrl) {
    return repository.remoteUrl;
  }

  if (repository?.remote === "github" && repository.name) {
    return `https://github.com/${repository.name}`;
  }

  return undefined;
}

export function getPullRequestUrl(
  repository?: GreptileRepository,
  number?: number,
  sourceRepoUrl?: string,
) {
  if (
    sourceRepoUrl?.includes("/pull/") ||
    sourceRepoUrl?.includes("/merge_requests/")
  ) {
    return sourceRepoUrl;
  }

  const repositoryUrl = getRepositoryUrl(repository, sourceRepoUrl);

  if (!repositoryUrl || typeof number !== "number") {
    return repositoryUrl;
  }

  if (repository?.remote === "gitlab" || repositoryUrl.includes("gitlab")) {
    return `${repositoryUrl}/-/merge_requests/${number}`;
  }

  return `${repositoryUrl}/pull/${number}`;
}

export function getCommentUrl(comment: GreptileComment) {
  const url = getPullRequestUrl(
    comment.mergeRequest?.repository,
    comment.mergeRequest?.prNumber,
    comment.mergeRequest?.sourceRepoUrl,
  );

  if (!url) {
    return undefined;
  }

  if (!comment.commentId || url.includes("#")) {
    return url;
  }

  const commentDigits = comment.commentId.replace(/\D/g, "");
  const isGithubComment =
    comment.mergeRequest?.repository?.remote === "github" ||
    /github\./i.test(url) ||
    /github\.com/i.test(url);

  if (!commentDigits || !isGithubComment || url.includes("/merge_requests/")) {
    return url;
  }

  return `${url}#discussion_r${commentDigits}`;
}

export function truncate(value: string, length = 120) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length - 1)}...`;
}

export function pullRequestIcon(pullRequest: MergeRequest) {
  if (pullRequest.isDraft) {
    return Icon.CircleEllipsis;
  }

  switch (pullRequest.state) {
    case "merged":
      return Icon.CheckCircle;
    case "closed":
      return Icon.XMarkCircle;
    default:
      return Icon.Dot;
  }
}
