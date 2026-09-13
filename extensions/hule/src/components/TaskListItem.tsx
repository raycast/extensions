import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { Task } from "../api/types";
import { memberIcon, priorityIcon, statusIcon } from "../helpers/appearance";
import type { HuleContext } from "../hooks/useHule";
import { TaskActions } from "./TaskActions";
import { TaskDetail } from "./TaskDetail";

/**
 * One task in a list.
 *
 * The row carries what you scan for and nothing else: the status as the leading
 * mark, the title with its key, then priority and who it is on. The due date,
 * the list name and the status LABEL are deliberately absent — the status is
 * already the leading mark, and the rest is one keystroke away in the details.
 */
export function TaskListItem({ task, context, onChange }: { task: Task; context: HuleContext; onChange: () => void }) {
  const status = context.statusesOf(task.listId).find((s) => s.id === task.statusId);
  const assignee = context.membersOf(task.workspaceId).find((m) => m.id === task.assigneeId);

  const accessories: List.Item.Accessory[] = [];
  if (task.priority !== "none") {
    accessories.push({ icon: priorityIcon(task.priority), tooltip: `Priority: ${task.priority}` });
  }
  if (assignee) {
    accessories.push({
      icon: memberIcon(assignee),
      tooltip: assignee.name ?? assignee.email ?? "Assignee",
    });
  }
  return (
    <List.Item
      icon={statusIcon(status)}
      title={task.title}
      subtitle={task.taskKey ?? undefined}
      keywords={task.taskKey ? [task.taskKey] : undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<TaskDetail task={task} context={context} onChange={onChange} />}
          />
          <TaskActions task={task} context={context} onChange={onChange} />
        </ActionPanel>
      }
    />
  );
}
