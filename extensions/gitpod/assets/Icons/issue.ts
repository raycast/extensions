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
    icon: { source: "issue-opened.svg", tintColor: Color.Green },
    text: "Open",
    color: Color.Green,
  };
}

export function getIssueAuthor(issue: IssueFieldsFragment | IssueDetailFieldsFragment) {
  return getGitHubUser(issue.author);
}
