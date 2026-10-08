import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useCallback } from "react";

import { getIssues, Issue } from "../api/issues";

const RECENT_VISITED_ISSUES_KEY = "jira-recent-visited-issues";
const MAX_RECENT_ISSUES = 3;

export function useEpicIssues(epicKey: string, options?: Record<string, unknown>) {
  const jql = epicKey ? `parent = ${epicKey}` : "issue = null";
  const { data: issues, isLoading, mutate } = useCachedPromise((jql) => getIssues({ jql }), [jql], options);
  return { issues, isLoading, mutate };
}

export default function useIssues(jql: string, options?: Record<string, unknown>) {
  const [recentIssues, setRecentIssues] = useCachedState<Issue[]>(RECENT_VISITED_ISSUES_KEY, []);

  const visitIssue = useCallback(
    (issue: Issue) => {
      setRecentIssues((current) => {
        const list = current ?? [];
        const next = [issue, ...list.filter((i) => i.id !== issue.id)];
        return next.slice(0, MAX_RECENT_ISSUES);
      });
    },
    [setRecentIssues],
  );

  const clearRecentIssues = useCallback(() => {
    setRecentIssues([]);
  }, [setRecentIssues]);

  const { data: issues, isLoading, mutate } = useCachedPromise((jql) => getIssues({ jql }), [jql], options);
  return { issues, isLoading, mutate, recentIssues, visitIssue, clearRecentIssues };
}
