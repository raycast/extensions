import { List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { Issue } from "../api/issues";
import { getUserAvatar } from "../helpers/avatars";
import { getStatusColor } from "../helpers/issues";
import { useEpicIssues } from "../hooks/useIssues";

import IssueActions from "./IssueActions";

type IssueListItemProps = {
  issue: Issue;
  mutate: MutatePromise<Issue[] | undefined>;
};

export default function IssueListItem({ issue, mutate }: IssueListItemProps) {
  const updatedAt = new Date(issue.fields.updated);
  const assignee = issue.fields.assignee;
  const { issues: epicIssues } = useEpicIssues(issue?.id ?? "");
  const hasChildIssues =
    (issue.fields.subtasks && issue.fields.subtasks.length > 0) || (epicIssues && epicIssues.length > 0);
  const keywords = [issue.key, issue.fields.status.name, issue.fields.issuetype.name];

  if (issue.fields.priority) {
    keywords.push(issue.fields.priority.name);
  }

  if (issue.fields.assignee) {
    keywords.push(issue.fields.assignee.displayName);
  }

  const accessories = [
    {
      text: {
        value: issue.fields.status.name,
        color: issue.fields.status.statusCategory
          ? getStatusColor(issue.fields.status.statusCategory.colorName)
          : undefined,
      },
    },
    {
      icon: getUserAvatar(assignee),
      tooltip: `Assignee: ${assignee ? assignee.displayName : "Unassigned"}`,
    },
    { date: updatedAt, tooltip: format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm") },
  ];

  if (issue.fields.priority) {
    accessories.push({ icon: issue.fields.priority.iconUrl, tooltip: `Priority: ${issue.fields.priority.name}` });
  }

  return (
    <List.Item
      key={issue.id}
      keywords={keywords}
      icon={{ value: issue.fields.issuetype.iconUrl, tooltip: `Issue Type: ${issue.fields.issuetype.name}` }}
      title={issue.fields.summary || "Unknown issue title"}
      subtitle={issue.key}
      accessories={accessories}
      actions={
        <IssueActions issue={issue} showChildIssuesAction={hasChildIssues} mutate={mutate} showDetailsAction={true} />
      }
    />
  );
}
