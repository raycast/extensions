import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { Task } from "../types";
import { getFormattedDescription } from "../utils";
import { priorityToIcon } from "../utils/priority";

interface TaskItemProps {
  task: Task;
  onMarkDone?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  showActions?: boolean;
}

const listTaskPreferences = getPreferenceValues<Preferences.ListTasks>();
export function TaskItem({
  task,
  onMarkDone,
  onDelete,
  onEdit,
  showActions = true,
}: TaskItemProps) {
  const taskDesc = getFormattedDescription(task);
  const priorityMeta = priorityToIcon(task.priority);

  return (
    <List.Item
      key={task.id}
      title={taskDesc}
      icon={task.completed ? Icon.Checkmark : priorityMeta.icon}
      detail={
        <List.Item.Detail
          markdown={listTaskPreferences.showDescriptionInDetails ? taskDesc : undefined}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={task.completed ? "Completed" : "Pending"}
                icon={task.completed ? Icon.Checkmark : Icon.Circle}
              />

              {task.priority && (
                <List.Item.Detail.Metadata.Label
                  title="Priority"
                  text={task.priority}
                  icon={priorityMeta.icon}
                />
              )}

              {task.dueDate && (
                <List.Item.Detail.Metadata.Label
                  title="Due Date"
                  text={task.dueDate.toLocaleDateString()}
                  icon={Icon.Calendar}
                />
              )}

              {task.scheduledDate && (
                <List.Item.Detail.Metadata.Label
                  title="Scheduled Date"
                  text={task.scheduledDate.toLocaleDateString()}
                  icon={Icon.Clock}
                />
              )}

              {task.startDate && (
                <List.Item.Detail.Metadata.Label
                  title="Start Date"
                  text={task.startDate.toLocaleDateString()}
                  icon={Icon.ArrowRight}
                />
              )}

              {task.recurrence && (
                <List.Item.Detail.Metadata.Label
                  title="Recurrence"
                  text={task.recurrence}
                  icon={Icon.Repeat}
                />
              )}

              {task.tags && task.tags.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {task.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={tag}
                      text={tag}
                      color={Color.Blue}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}

              {task.completedAt && (
                <List.Item.Detail.Metadata.Label
                  title="Completed At"
                  text={task.completedAt.toLocaleDateString()}
                  icon={Icon.CheckCircle}
                />
              )}

              {task.filePath && (
                <List.Item.Detail.Metadata.Label
                  title="File"
                  text={task.filePath.split("/").pop() || ""}
                  icon={Icon.Document}
                />
              )}

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label
                title="Created At"
                text={task.createdAt.toLocaleDateString()}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      accessories={[
        {
          icon: task.dueDate ? Icon.Calendar : undefined,
          date: task.dueDate,
          tooltip: task.dueDate ? `Due: ${task.dueDate.toLocaleDateString()}` : undefined,
        },
        {
          icon: task.tags && task.tags.length > 0 ? Icon.Tag : undefined,
          text: task.tags?.join(", "),
          tooltip: task.tags ? `Tags: ${task.tags.join(", ")}` : undefined,
        },
        {
          icon: task.priority ? priorityMeta.icon : undefined,
          text: task.priority,
          tooltip: task.priority ? `Priority: ${task.priority}` : undefined,
        },
      ]}
      actions={
        showActions ? (
          <ActionPanel>
            <ActionPanel.Section>
              {onMarkDone && (
                <Action
                  title={task.completed ? "Mark as Not Done" : "Mark as Done"}
                  icon={task.completed ? Icon.Circle : Icon.Checkmark}
                  onAction={() => onMarkDone(task)}
                />
              )}
              {onEdit && (
                <Action title="Edit Task" icon={Icon.Pencil} onAction={() => onEdit(task)} />
              )}
              {onDelete && (
                <Action
                  title="Delete Task"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => onDelete(task)}
                />
              )}
            </ActionPanel.Section>

            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open in Obsidian"
                url={`obsidian://open?vault=${encodeURIComponent(
                  task.filePath?.split("/").slice(-3, -2)[0] || ""
                )}&file=${encodeURIComponent(task.filePath?.split("/").pop() || "")}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.CopyToClipboard
                title="Copy Task Description"
                content={task.description}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
