import { Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { Issue } from "../api/issues";
import { getStatusColor } from "../helpers/issues";

import IssueActions from "./IssueActions";

type IssueListItemProps = {
  issue: Issue;
  mutate: MutatePromise<Issue[] | undefined>;
};

export default function IssueListItem({ issue, mutate }: IssueListItemProps) {
  const updatedAt = new Date(issue.fields.updated);
  const assignee = issue.fields.assignee;

  const keywords = [issue.key, issue.fields.status.name, issue.fields.issuetype.name, issue.fields.priority.name];

  if (issue.fields.assignee) {
    keywords.push(issue.fields.assignee.displayName);
  }

  return (
    <List.Item
      key={issue.id}
      keywords={keywords}
      icon={{ value: issue.fields.issuetype.iconUrl, tooltip: `Issue Type: ${issue.fields.issuetype.name}` }}
      title={issue.fields.summary}
      subtitle={issue.key}
      accessories={[
        {
          text: {
            value: issue.fields.status.name,
            color: getStatusColor(issue.fields.status.statusCategory.colorName),
          },
        },
        {
          icon: assignee ? assignee.avatarUrls["32x32"] : Icon.Person,
          tooltip: `Assignee: ${assignee ? assignee.displayName : "Unassigned"}`,
        },
        { date: updatedAt, tooltip: format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm") },
        { icon: issue.fields.priority.iconUrl, tooltip: `Priority: ${issue.fields.priority.name}` },
      ]}
      actions={<IssueActions issue={issue} mutate={mutate} showDetailsAction={true} />}
    />
  );
}
