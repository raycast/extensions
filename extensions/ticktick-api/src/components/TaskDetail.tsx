import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Detail,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { completeTask, deleteTask } from "../api";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "../constants";
import { Project, Task } from "../types";
import { TaskForm } from "./TaskForm";

interface TaskDetailProps {
  task: Task;
  projects: Project[];
  onRefresh: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string | undefined {
  const date = new Date(dateStr);
  if (date.getHours() === 0 && date.getMinutes() === 0) return undefined;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getRelativeDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0)
    return `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? "s" : ""} overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `in ${diff} day${diff !== 1 ? "s" : ""}`;
}

export function TaskDetail({ task, projects, onRefresh }: TaskDetailProps) {
  const project = projects.find((p) => p.id === task.projectId);

  const lines: string[] = [];
  lines.push(`# ${task.title}`);
  lines.push("");

  if (task.content?.trim()) {
    lines.push(task.content.trim());
    lines.push("");
  }

  if (task.items && task.items.length > 0) {
    lines.push("## Checklist");
    lines.push("");
    const sorted = [...task.items].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const item of sorted) {
      const check = item.status === 2 ? "x" : " ";
      lines.push(`- [${check}] ${item.title}`);
    }
    lines.push("");
  }

  const markdown = lines.join("\n");

  const doneCount = task.items?.filter((i) => i.status === 2).length ?? 0;
  const totalCount = task.items?.length ?? 0;

  return (
    <Detail
      navigationTitle={task.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Priority"
            text={PRIORITY_LABELS[task.priority] ?? "None"}
            icon={{
              source: Icon.Circle,
              tintColor: PRIORITY_COLORS[task.priority],
            }}
          />
          {task.dueDate && (
            <Detail.Metadata.Label
              title="Due Date"
              text={`${formatDate(task.dueDate)} (${getRelativeDate(task.dueDate)})`}
              icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
            />
          )}
          {task.dueDate && formatTime(task.dueDate) && (
            <Detail.Metadata.Label
              title="Time"
              text={formatTime(task.dueDate)!}
              icon={{ source: Icon.Clock, tintColor: Color.Blue }}
            />
          )}
          {project && (
            <Detail.Metadata.Label
              title="Project"
              text={project.name}
              icon={{
                source: Icon.Folder,
                tintColor: project.color ?? Color.SecondaryText,
              }}
            />
          )}
          {task.tags && task.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {task.tags.map((tag) => (
                <Detail.Metadata.TagList.Item
                  key={tag}
                  text={tag}
                  color={Color.Purple}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
          {task.items && task.items.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Checklist"
                text={`${doneCount}/${totalCount} completed`}
                icon={{
                  source: Icon.BulletPoints,
                  tintColor:
                    doneCount === totalCount ? Color.Green : Color.Orange,
                }}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Task"
            icon={Icon.Pencil}
            target={
              <TaskForm task={task} projects={projects} onSubmit={onRefresh} />
            }
          />
          <ActionPanel.Section title="Task">
            <Action
              title="Complete Task"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                try {
                  await completeTask(task.projectId, task.id);
                  await showHUD(`Completed: ${task.title}`);
                  onRefresh();
                } catch (err) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to complete task",
                    message: String(err),
                  });
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy & Open">
            <Action.OpenInBrowser
              title="Open in Ticktick"
              icon={Icon.Globe}
              url={`https://ticktick.com/webapp/#q/all/tasks/${task.id}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action
              title="Copy Title"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => Clipboard.copy(task.title)}
            />
            {task.content ? (
              <Action
                title="Copy Notes"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={() => Clipboard.copy(task.content ?? "")}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Task"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Task",
                    message: `Are you sure you want to delete "${task.title}"?`,
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  try {
                    await deleteTask(task.projectId, task.id);
                    await showHUD(`Deleted: ${task.title}`);
                    onRefresh();
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to delete task",
                      message: String(err),
                    });
                  }
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
