import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { Task, PRIORITY_LABELS, PRIORITY_COLORS } from "../types/ticktick";
import { toggleTaskAS } from "../lib/applescript";
import { format, parseISO, isPast } from "date-fns";

interface Props {
  task: Task;
  projectName?: string;
  onRefresh: () => void;
}

function priorityIcon(priority: number): { source: Icon; tintColor: string } | Icon {
  if (priority === 5) return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (priority === 3) return { source: Icon.ExclamationMark, tintColor: Color.Orange };
  if (priority === 1) return { source: Icon.ExclamationMark, tintColor: Color.Green };
  return Icon.Circle;
}

function formatDue(dueDate?: string): string | undefined {
  if (!dueDate) return undefined;
  try {
    return format(parseISO(dueDate), "MMM d");
  } catch {
    return undefined;
  }
}

export function ASTaskItem({ task, projectName, onRefresh }: Props) {
  const accessories: List.Item.Accessory[] = [];

  if (task.priority > 0) {
    accessories.push({ text: { value: PRIORITY_LABELS[task.priority], color: PRIORITY_COLORS[task.priority] as Color } });
  }

  const due = formatDue(task.dueDate);
  if (due) {
    const overdue = task.dueDate ? isPast(parseISO(task.dueDate)) : false;
    accessories.push({
      text: { value: due, color: overdue ? Color.Red : Color.SecondaryText },
      icon: { source: Icon.Calendar, tintColor: overdue ? Color.Red : Color.SecondaryText },
    });
  }

  if (task.tags && task.tags.length > 0) {
    accessories.push({ text: task.tags[0], icon: Icon.Tag });
  }

  if (projectName) {
    accessories.push({ text: projectName, icon: Icon.Folder });
  }

  return (
    <List.Item
      icon={priorityIcon(task.priority)}
      title={task.title}
      subtitle={task.content ? (task.content.length > 60 ? task.content.slice(0, 60) + "…" : task.content) : undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Task">
            <Action
              title="Toggle Complete"
              icon={Icon.Checkmark}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Updating task…" });
                const ok = await toggleTaskAS(task.id);
                if (ok) {
                  toast.style = Toast.Style.Success;
                  toast.title = "Task updated";
                  onRefresh();
                } else {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to update task";
                }
              }}
            />
            <Action.OpenInBrowser
              title="Open in TickTick"
              url={`https://ticktick.com/webapp/#p/${task.projectId}/tasks/${task.id}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Title"
              content={task.title}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {task.content && (
              <Action.CopyToClipboard
                title="Copy Notes"
                content={task.content}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
