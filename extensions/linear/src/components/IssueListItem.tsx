import { List, Action, Icon, ActionPanel } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { IssuePriorityValue, User } from "@linear/sdk";

import { IssueResult } from "../api/getIssues";
import { statusIcons } from "../helpers/states";
import { getUserIcon } from "../helpers/users";
import { priorityIcons } from "../helpers/priorities";

import IssueDetail from "./IssueDetail";
import IssueActions from "./IssueActions";

type IssueListItemProps = {
  issue: IssueResult;
  mutateList?: MutatePromise<IssueResult[] | undefined>;
  mutateSubIssues?: MutatePromise<IssueResult[] | undefined>;
  priorities: IssuePriorityValue[] | undefined;
  users: User[] | undefined;
  me: User | undefined;
};

export default function IssueListItem({
  issue,
  mutateList,
  mutateSubIssues,
  priorities,
  me,
  users,
}: IssueListItemProps) {
  const keywords = [issue.identifier, issue.state.name, issue.priorityLabel];

  if (issue.assignee) {
    keywords.push(issue.assignee.email, issue.assignee.displayName);
  }

  const updatedAt = new Date(issue.updatedAt);

  const accessories = [
    {
      date: updatedAt,
      tooltip: `Updated: ${format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
    {
      icon: { source: statusIcons[issue.state.type], tintColor: issue.state.color },
      tooltip: `Status: ${issue.state.name}`,
    },
    {
      icon: getUserIcon(issue.assignee),
      tooltip: issue.assignee ? `Assignee: ${issue.assignee?.displayName} (${issue.assignee?.email})` : "Unassigned",
    },
  ];

  return (
    <List.Item
      key={issue.id}
      title={issue.title}
      icon={{ source: priorityIcons[issue.priority] }}
      subtitle={issue.identifier}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel title={issue.identifier}>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<IssueDetail issue={issue} mutateList={mutateList} priorities={priorities} users={users} me={me} />}
          />

          <IssueActions
            issue={issue}
            mutateList={mutateList}
            mutateSubIssues={mutateSubIssues}
            priorities={priorities}
            users={users}
            me={me}
          />
        </ActionPanel>
      }
    />
  );
}
