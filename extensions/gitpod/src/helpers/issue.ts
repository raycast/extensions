import { Color } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

import { IssueDetailFieldsFragment, IssueFieldsFragment, IssueStateReason } from "../generated/graphql";

import { getGitHubUser } from "./users";

const VISITED_ISSUE_KEY = "VISITED_ISSUE";
const VISITED_ISSUE_LENGTH = 10;

// History was stored in `LocalStorage` before, after migration it's stored in `Cache`
async function loadVisitedIssues() {
  const item = await LocalStorage.getItem<string>(VISITED_ISSUE_KEY);
  if (item) {
    const parsed = JSON.parse(item).slice(0, VISITED_ISSUE_LENGTH);
    return parsed as IssueFieldsFragment[];
  } else {
    return [];
  }
}

export function useIssueHistory() {
  const [history, setHistory] = useCachedState<IssueFieldsFragment[]>("IssueHistory", []);
  const [migratedHistory, setMigratedHistory] = useCachedState<boolean>("migratedIssueHistory", false);

  useEffect(() => {
    if (!migratedHistory) {
      loadVisitedIssues().then((issues) => {
        setHistory(issues);
        setMigratedHistory(true);
      });
    }
  }, [migratedHistory]);

  function visitIssue(issue: IssueFieldsFragment) {
    const visitedIssues = [issue, ...(history?.filter((item) => item.id !== issue.id) ?? [])];
    LocalStorage.setItem(VISITED_ISSUE_KEY, JSON.stringify(visitedIssues));
    const nextIssue = visitedIssues.slice(0, VISITED_ISSUE_LENGTH);
    setHistory(nextIssue);
  }

  function removeIssue(issue: IssueFieldsFragment) {
    const visitedIssues = [...(history?.filter((item) => item.id !== issue.id) ?? [])];
    LocalStorage.setItem(VISITED_ISSUE_KEY, JSON.stringify(visitedIssues));
    const nextIssue = visitedIssues.slice(0, VISITED_ISSUE_LENGTH);
    setHistory(nextIssue);
  }

  return { history, visitIssue, removeIssue };
}

export function getIssueStatus(issue: IssueFieldsFragment | IssueDetailFieldsFragment) {
  if (issue.stateReason === IssueStateReason.NotPlanned) {
    return {
      icon: { source: "Icons/skip.svg", tintColor: Color.SecondaryText },
      text: "Closed as not planned",
      color: Color.Purple,
    };
  }

  if (issue.stateReason === IssueStateReason.Completed) {
    return {
      icon: { source: "Icons/issue-closed.svg", tintColor: Color.Purple },
      text: "Closed as completed",
      color: Color.Purple,
    };
  }

  return {
    icon: { source: "Icons/issue-opened.svg", tintColor: Color.Green },
    text: "Open",
    color: Color.Green,
  };
}

export function getIssueAuthor(issue: IssueFieldsFragment | IssueDetailFieldsFragment) {
  return getGitHubUser(issue.author);
}
