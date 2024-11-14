import { useMemo } from "react";

import { type Issue, type IssueDetail } from "../api/issues";
import useIssues, { useEpicIssues } from "../hooks/useIssues";

import StatusIssueList from "./StatusIssueList";

export default function IssueChildIssues({ issue }: { issue: Issue }) {
  const {
    mutate: mutateEpicIssues,
    issues: epicIssues,
    isLoading: isLoadingEpicIssues,
  } = useEpicIssues(issue?.id ?? "");

  // Only create JQL if there are subtask
  const subtaskJql = useMemo(() => {
    if (!issue.fields.subtasks?.length) return "";
    const subtaskIds = issue.fields.subtasks.map((subtask) => subtask.id);
    return `issue in (${subtaskIds.join(",")})`;
  }, [issue.fields.subtasks]);

  const {
    issues: subtasks,
    isLoading: isLoadingSubtasks,
    mutate: mutateSubtasks,
  } = useIssues(
    subtaskJql || "issue = null", // Provide valid JQL even when no subtasks
  );

  const isEpic = issue.fields.issuetype?.name === "Epic";

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

  return (
    <StatusIssueList
      issues={childIssues}
      isLoading={isLoading}
      mutate={async (data) => {
        if (isEpic) {
          return mutateEpicIssues(data);
        }
        // For subtasks, we need to mutate the subtasks data
        return mutateSubtasks(data);
      }}
    />
  );
}
