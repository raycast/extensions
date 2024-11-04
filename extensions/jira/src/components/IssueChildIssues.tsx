import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getIssues, type Issue, type IssueDetail } from "../api/issues";

import StatusIssueList from "./StatusIssueList";

export default function IssueChildIssues({ issue }: { issue: Issue }) {
  const { mutate } = useIssues("assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC");
  const { mutate: mutateEpicIssues } = useEpicIssues(
    "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC",
  );
  // Only create JQL if there are subtask
  const subtaskJql = useMemo(() => {
    if (!issue.fields.subtasks?.length) return "";
    const subtaskIds = issue.fields.subtasks.map((subtask) => subtask.id);
    return `issue in (${subtaskIds.join(",")})`;
  }, [issue.fields.subtasks]);

  const { issues: subtasks, isLoading: isLoadingSubtasks } = useIssues(
    subtaskJql || "issue = null", // Provide valid JQL even when no subtasks
  );

  const isEpic = issue.fields.issuetype?.name === "Epic";
  const { issues: epicIssues, isLoading: isLoadingEpicIssues } = useEpicIssues(
    isEpic ? issue.id : "", // Only fetch epic issues for epics
  );

  // Memoize the combined and filtered child issues
  const childIssues = useMemo(() => {
    const allIssues = [...(subtasks || []), ...(epicIssues || [])];
    // Ensure unique keys by using issue ID
    return allIssues
      .filter((issue): issue is IssueDetail => issue !== null)
      .map((issue) => ({
        ...issue,
        key: `${issue.key}`, // Ensure unique keys
      }));
  }, [subtasks, epicIssues]);

  const isLoading = isLoadingSubtasks || isLoadingEpicIssues;

  return <StatusIssueList issues={childIssues} isLoading={isLoading} mutate={isEpic ? mutateEpicIssues : mutate} />;
}

// Updated hooks file
export function useEpicIssues(epicKey: string, options?: Record<string, unknown>) {
  const jql = epicKey ? `parent = ${epicKey}` : "issue = null"; // Provide valid JQL when no epic key
  const { data: issues, isLoading, mutate } = useCachedPromise((jql) => getIssues({ jql }), [jql], options);
  return { issues, isLoading, mutate };
}

export function useIssues(jql: string, options?: Record<string, unknown>) {
  const { data: issues, isLoading, mutate } = useCachedPromise((jql) => getIssues({ jql }), [jql], options);
  return { issues, isLoading, mutate };
}
