import { IssuePriorityValue, User } from "@linear/sdk";
import { List, Action, Icon, ActionPanel } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { IssueResult } from "../api/getIssues";
import { formatCycle } from "../helpers/cycles";
import { getDateIcon } from "../helpers/dates";
import { getEstimateLabel } from "../helpers/estimates";
import { priorityIcons } from "../helpers/priorities";
import { getProjectIcon } from "../helpers/projects";
import { getStatusIcon } from "../helpers/states";
import { getUserIcon } from "../helpers/users";

import IssueActions from "./IssueActions";
import IssueDetail from "./IssueDetail";

type IssueListItemProps = {
  issue: IssueResult;
  mutateList?: MutatePromise<IssueResult[] | undefined>;
  mutateSubIssues?: MutatePromise<IssueResult[] | undefined>;
  priorities: IssuePriorityValue[] | undefined;
  me: User | undefined;
};

export default function IssueListItem({ issue, mutateList, mutateSubIssues, priorities, me }: IssueListItemProps) {
  const keywords = [issue.identifier, issue.state.name, issue.priorityLabel];

  if (issue.assignee) {
    keywords.push(issue.assignee.email, issue.assignee.displayName);
  }

  const updatedAt = new Date(issue.updatedAt);

  const dueDate = issue.dueDate ? new Date(issue.dueDate) : null;
  const estimate = issue.estimate
    ? {
        icon: { source: { light: "light/estimate.svg", dark: "dark/estimate.svg" } },
        text: getEstimateLabel({ estimate: issue.estimate, issueEstimationType: issue.team.issueEstimationType }),
      }
    : null;
  const cycle = issue.cycle ? formatCycle(issue.cycle) : null;
  const project = issue.project || null;

  const hasLabels = issue.labels.nodes.length > 0;

  const accessories: List.Item.Accessory[] = [
    {
      date: updatedAt,
      tooltip: `Updated: ${format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
    {
      icon: dueDate ? getDateIcon(dueDate) : undefined,
      text: dueDate ? format(dueDate, "MMM dd") : undefined,
      tooltip: dueDate ? `Due date: ${format(dueDate, "MM/dd/yyyy")}` : undefined,
    },
    {
      icon: hasLabels ? Icon.Tag : undefined,
      text: hasLabels ? String(issue.labels.nodes.length) : undefined,
      tooltip: hasLabels ? issue.labels.nodes.map((label) => label.name).join(", ") : undefined,
    },
    {
      icon: project ? getProjectIcon(project) : undefined,
      tooltip: `Project: ${project ? project.name : undefined}`,
    },
    {
      icon: cycle ? { source: cycle.icon } : undefined,
      text: cycle ? String(cycle.number) : undefined,
      tooltip: cycle ? `Cycle: ${cycle.title}` : undefined,
    },
    {
      icon: estimate ? estimate.icon : undefined,
      text: estimate ? estimate.text : undefined,
    },
    {
      icon: getStatusIcon(issue.state),
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
      icon={{ value: { source: priorityIcons[issue.priority] }, tooltip: `Priority: ${issue.priorityLabel}` }}
      subtitle={issue.identifier}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel title={issue.identifier}>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<IssueDetail issue={issue} mutateList={mutateList} priorities={priorities} me={me} />}
          />

          <IssueActions
            issue={issue}
            mutateList={mutateList}
            mutateSubIssues={mutateSubIssues}
            priorities={priorities}
            me={me}
          />
        </ActionPanel>
      }
    />
  );
}
