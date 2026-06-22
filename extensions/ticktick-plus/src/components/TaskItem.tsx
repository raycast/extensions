import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { Task, PRIORITY_LABELS, PRIORITY_COLORS, Project } from "../types/ticktick";
import { completeTask, uncompleteTask, deleteTask } from "../api/tasks";
import { TaskDetail } from "./TaskDetail";
import { EditTaskForm } from "./EditTaskForm";
import { format, parseISO, isPast } from "date-fns";

interface Props {
  task: Task;
  projectName?: string;
  projects?: Project[];
  onComplete: () => void;
  onDelete: () => void;
  onRevalidate: () => void;
}

function priorityIcon(priority: number): { source: Icon; tintColor: string } | Icon {
  if (priority === 5) return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (priority === 3) return { source: Icon.ExclamationMark, tintColor: Color.Orange };
  if (priority === 1) return { source: Icon.ExclamationMark, tintColor: Color.Green };
  return Icon.Circle;
}

function formatDueDate(dueDate?: string): string | undefined {
  if (!dueDate) return undefined;
  try {
    return format(parseISO(dueDate), "MMM d");
  } catch {
    return undefined;
  }
}

function isDueDateOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  try {
    return isPast(parseISO(dueDate));
  } catch {
    return false;
  }
}

async function handleCompleteWithUndo(task: Task, onComplete: () => void, onRevalidate: () => void) {
  let undone = false;
  try {
    await completeTask(task.projectId, task.id);
  } catch (err) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to complete task", message: String(err) });
    return;
  }
  onComplete();
  const toast = await showToast({
    style: Toast.Style.Success,
    title: "Task completed",
    message: task.title.length > 40 ? task.title.slice(0, 40) + "…" : task.title,
    primaryAction: {
      title: "Undo",
      shortcut: { modifiers: ["cmd"], key: "z" },
      onAction: async (t) => {
        undone = true;
        t.style = Toast.Style.Animated;
        t.title = "Undoing…";
        try {
          await uncompleteTask(task);
          t.style = Toast.Style.Success;
          t.title = "Task restored";
          onRevalidate();
        } catch (err) {
          t.style = Toast.Style.Failure;
          t.title = "Undo failed";
          t.message = String(err);
        }
      },
    },
  });
  await new Promise<void>((resolve) => setTimeout(resolve, 10000));
  if (!undone) toast.hide();
}

export function TaskItem({ task, projectName, projects = [], onComplete, onDelete, onRevalidate }: Props) {
  const accessories: List.Item.Accessory[] = [];

  if (task.priority > 0) {
    accessories.push({
      text: { value: PRIORITY_LABELS[task.priority], color: PRIORITY_COLORS[task.priority] as Color },
    });
  }

  const due = formatDueDate(task.dueDate);
  if (due) {
    const overdue = isDueDateOverdue(task.dueDate);
    accessories.push({
      text: { value: due, color: overdue ? Color.Red : Color.SecondaryText },
      icon: { source: Icon.Calendar, tintColor: overdue ? Color.Red : Color.SecondaryText },
    });
  }

  if (task.tags && task.tags.length > 0) {
    accessories.push({ text: task.tags[0], icon: Icon.Tag });
  }

  if (task.items && task.items.length > 0) {
    const done = task.items.filter((i) => i.status === 2).length;
    accessories.push({ text: `${done}/${task.items.length}`, icon: Icon.CheckList });
  }

  if (projectName) {
    accessories.push({ text: projectName, icon: Icon.Folder });
  }

  return (
    <List.Item
      key={task.id}
      icon={priorityIcon(task.priority)}
      title={task.title}
      subtitle={task.content ? (task.content.length > 60 ? task.content.slice(0, 60) + "…" : task.content) : undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Task">
            <Action.Push
              title="View Task Details"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              target={<TaskDetail task={task} projects={projects} projectName={projectName} onMutate={onRevalidate} />}
            />
            <Action.Push
              title="Edit Task"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<EditTaskForm task={task} onSave={onRevalidate} />}
            />
            <Action
              title="Complete Task"
              icon={Icon.Checkmark}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onAction={() => handleCompleteWithUndo(task, onComplete, onRevalidate)}
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

          <ActionPanel.Section title="Danger">
            <Action
              title="Delete Task"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting task…" });
                try {
                  await deleteTask(task.projectId, task.id);
                  toast.style = Toast.Style.Success;
                  toast.title = "Task deleted";
                  onDelete();
                } catch (err) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to delete";
                  toast.message = String(err);
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
