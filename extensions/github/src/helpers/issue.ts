import { Color } from "@raycast/api";

import { IssueDetailFieldsFragment, IssueFieldsFragment, IssueStateReason } from "../generated/graphql";

import { getGitHubUser } from "./users";

export function getIssueStatus(issue: IssueFieldsFragment | IssueDetailFieldsFragment) {
  if (issue.stateReason === IssueStateReason.NotPlanned) {
    return {
      icon: { source: "skip.svg", tintColor: Color.SecondaryText },
      text: "Closed as not planned",
      color: Color.Purple,
    };
  }

  if (issue.stateReason === IssueStateReason.Completed) {
    return {
      icon: { source: "issue-closed.svg", tintColor: Color.Purple },
      text: "Closed as completed",
      color: Color.Purple,
    };
  }

  return {
    icon: { source: "issue-open.svg", tintColor: Color.Green },
    text: "Open",
    color: Color.Green,
  };
}

export function getIssueAuthor(issue: IssueFieldsFragment | IssueDetailFieldsFragment) {
  return getGitHubUser(issue.author);
}

export const ISSUE_SORT_TYPES_TO_QUERIES = [
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

export const ISSUE_DEFAULT_SORT_QUERY = "sort:updated-desc";

const REPO_QUALIFIER_REGEX = /\brepo:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\b/i;
const REPO_ISSUE_REFERENCE_REGEX =
  /(?:https?:\/\/github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/issues\/|#)(\d+)\b/i;
const SEARCH_QUALIFIER_REGEX =
  /\b(?:repo|author|assignee|mentions|commenter|involves|team|label|milestone|project|status|head|base|language|is|type|state|user|org|sort|archived|no|review|draft|created|updated|closed|linked|in|comments|interactions|reactions):[^\s]+/gi;

export type IssueNumberLookup = {
  owner: string;
  name: string;
  issueNumber: number;
};

/**
 * GitHub's issue search API has no number qualifier, so `#123` never matches
 * issue 123. When the query points at a specific repository, look the issue up
 * with `repository.issue(number:)` instead.
 */
export function parseIssueNumberLookup(
  searchText: string,
  repositoryNameWithOwner?: string | null,
): IssueNumberLookup | null {
  const referenceMatch = searchText.match(REPO_ISSUE_REFERENCE_REGEX);
  if (referenceMatch) {
    return {
      owner: referenceMatch[1],
      name: referenceMatch[2],
      issueNumber: Number.parseInt(referenceMatch[3], 10),
    };
  }

  const repoQualifierMatch = searchText.match(REPO_QUALIFIER_REGEX);
  const hintedRepo = repositoryNameWithOwner?.replace(/^repo:/, "");
  const repo = repoQualifierMatch
    ? `${repoQualifierMatch[1]}/${repoQualifierMatch[2]}`
    : hintedRepo?.includes("/")
      ? hintedRepo
      : null;

  if (!repo) {
    return null;
  }

  const remainder = searchText.replace(SEARCH_QUALIFIER_REGEX, " ").replace(/\s+/g, " ").trim();
  const numberMatch = remainder.match(/^#?(\d+)$/) ?? searchText.match(/(?:^|\s)#(\d+)(?:\s|$)/);
  if (!numberMatch) {
    return null;
  }

  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    return null;
  }

  return { owner, name, issueNumber: Number.parseInt(numberMatch[1], 10) };
}

/** `#123` is not a search qualifier; keep the digits so text search can still run as a fallback. */
export function normalizeIssueSearchText(searchText: string): string {
  return searchText.replace(/(^|\s)#(\d+)(?=\s|$)/g, "$1$2").trim();
}
