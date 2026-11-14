import { List } from "@raycast/api";
import { actorIcon, actorName, priorityInfo, statusIcon, statusName } from "../lib/format";
import type { WorkspaceContext } from "../lib/hooks";
import type { Issue } from "../lib/types";
import { IssueActions } from "./IssueActions";

export function IssueListItem(props: {
  issue: Issue;
  context: WorkspaceContext;
  onChange?: () => void;
  /** Search snippet shown beside the title. */
  snippet?: string;
}) {
  const { issue, context, onChange, snippet } = props;
  const priority = priorityInfo(issue.priority);
  const assignee = actorName(issue.assignee_type, issue.assignee_id, context);
  const accessories: List.Item.Accessory[] = [];

  if (issue.priority !== "none") accessories.push({ icon: priority.icon, tooltip: `Priority: ${priority.name}` });
  if (assignee) {
    accessories.push({
      icon: actorIcon(issue.assignee_type, issue.assignee_id, context),
      tooltip: `Assignee: ${assignee}`,
    });
  }
  accessories.push({
    date: new Date(issue.last_activity_at ?? issue.updated_at),
    tooltip: `Updated ${new Date(issue.updated_at).toLocaleString()}`,
  });

  return (
    <List.Item
      id={issue.id}
      title={issue.title}
      subtitle={snippet ? `${issue.identifier} · ${snippet}` : issue.identifier}
      keywords={[issue.identifier, String(issue.number)]}
      icon={{
        value: statusIcon(issue.status, context.statuses),
        tooltip: issue.status_name ?? statusName(issue.status, context.statuses),
      }}
      accessories={accessories}
      actions={<IssueActions issue={issue} context={context} onChange={onChange} />}
    />
  );
}
