import { useMemo } from "react";

import { Issue, IssueDetail } from "../api/issues";
import useIssues, { useEpicIssues } from "../hooks/useIssues";

import StatusIssueList from "./StatusIssueList";

export default function IssueChildIssues({ issue }: { issue: Issue }) {
  const { mutate } = useIssues("assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC");

  const subtaskJql = issue.fields.subtasks?.length
    ? `issue in (${issue.fields.subtasks.map((subtask) => subtask.key).join(",")})`
    : "";
  const { issues: subtasks, isLoading: isLoadingSubtasks } = useIssues(subtaskJql);

  const isEpic = issue.fields.issuetype && issue.fields.issuetype.name === "Epic";
  const { issues: epicIssues, isLoading: isLoadingEpicIssues } = useEpicIssues(isEpic ? issue.key : "");

  const childIssues = useMemo(() => {
    const allIssues = [...(subtasks || []), ...(epicIssues || [])];
    return allIssues.filter((issue): issue is IssueDetail => issue !== null);
  }, [subtasks, epicIssues]);

  const isLoading = isLoadingSubtasks || isLoadingEpicIssues;

  return <StatusIssueList issues={childIssues} isLoading={isLoading} mutate={mutate} />;
}
