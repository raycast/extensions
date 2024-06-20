import { Color } from "@raycast/api";

import { commands } from "../../package.json";
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

const SORT_TYPE_PREFERENCE = commands
  .find(({ name }) => name === "my-issues-menu")!
  .preferences!.find(({ name }) => name === "sortQuery")! as {
  default: string;
  data: { title: string; value: string }[];
};

export const ISSUE_SORT_TYPES_TO_QUERIES = SORT_TYPE_PREFERENCE.data;
export const ISSUE_DEFAULT_SORT_QUERY = SORT_TYPE_PREFERENCE.default;
