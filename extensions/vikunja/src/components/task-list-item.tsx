import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { updateTask, Project, Task } from "../api";
import { formatDueDate, dueDateColor } from "../helpers/dates";
import { PRIORITY_MAP, PRIORITY_COLORS } from "../helpers/priorities";
import { TaskDetail } from "./task-detail";
import { EditTaskForm } from "./edit-task-form";

export function TaskListItem({
  task,
  baseUrl,
  projects,
  onToggleDone,
  onDelete,
  onRefresh,
}: {
  task: Task;
  baseUrl: string;
  projects: Project[];
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRefresh: () => void;
}) {
  const { push } = useNavigation();
  const dueText = formatDueDate(task.due_date);
  const dueColor = dueDateColor(task.due_date);

  const accessories: List.Item.Accessory[] = [];

  if (task.labels?.length > 0) {
    for (const label of task.labels) {
      accessories.push({
        tag: { value: label.title, color: label.hex_color as Color },
      });
    }
  }

  if (task.priority > 0) {
    accessories.push({
      tag: {
        value: PRIORITY_MAP[task.priority] ?? `P${task.priority}`,
        color: PRIORITY_COLORS[task.priority],
      },
    });
  }

  if (dueText) {
    accessories.push({ text: { value: dueText, color: dueColor } });
  }

  if (task.is_favorite) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }

  return (
    <List.Item
      title={task.title}
      subtitle={task.description?.slice(0, 60)}
      icon={
        task.done
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : Icon.Circle
      }
      accessories={accessories}
      actions={
        <TaskActions
          task={task}
          baseUrl={baseUrl}
          projects={projects}
          onToggleDone={onToggleDone}
          onDelete={onDelete}
          onRefresh={onRefresh}
          onShowDetail={() =>
            push(
              <TaskDetail
                task={task}
                baseUrl={baseUrl}
                projects={projects}
                onToggleDone={onToggleDone}
                onDelete={onDelete}
                onRefresh={onRefresh}
              />,
            )
          }
        />
      }
    />
  );
}

export function TaskActions({
  task,
  baseUrl,
  projects,
  onToggleDone,
  onDelete,
  onRefresh,
  onShowDetail,
}: {
  task: Task;
  baseUrl: string;
  projects: Project[];
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRefresh: () => void;
  onShowDetail?: () => void;
}) {
  const { push } = useNavigation();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {onShowDetail && (
          <Action
            title="View Details"
            icon={Icon.Eye}
            onAction={onShowDetail}
          />
        )}
        <Action
          title={task.done ? "Reopen Task" : "Complete Task"}
          icon={task.done ? Icon.Circle : Icon.CheckCircle}
          shortcut={onShowDetail ? { modifiers: ["cmd"], key: "d" } : undefined}
          onAction={() => onToggleDone(task)}
        />
        <Action.OpenInBrowser
          title="Open in Vikunja"
          url={`${baseUrl}/tasks/${task.id}`}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <Action
          title="Edit Task"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() =>
            push(
              <EditTaskForm
                task={task}
                projects={projects}
                onRefresh={onRefresh}
              />,
            )
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Quick Actions">
        <ActionPanel.Submenu
          title="Set Priority\u2026"
          icon={Icon.Signal3}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        >
          {Object.entries(PRIORITY_MAP).map(([value, label]) => (
            <Action
              key={value}
              title={label}
              icon={
                task.priority === parseInt(value)
                  ? Icon.CheckCircle
                  : Icon.Circle
              }
              onAction={async () => {
                try {
                  await updateTask(task.id, { priority: parseInt(value) });
                  showToast({
                    style: Toast.Style.Success,
                    title: `Priority set to ${label}`,
                  });
                  onRefresh();
                } catch (error) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to set priority",
                    message:
                      error instanceof Error ? error.message : "Unknown error",
                  });
                }
              }}
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title={task.is_favorite ? "Remove Favorite" : "Add Favorite"}
          icon={task.is_favorite ? Icon.StarDisabled : Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={async () => {
            try {
              await updateTask(task.id, { is_favorite: !task.is_favorite });
              showToast({
                style: Toast.Style.Success,
                title: task.is_favorite
                  ? "Removed from favorites"
                  : "Added to favorites",
              });
              onRefresh();
            } catch (error) {
              showToast({
                style: Toast.Style.Failure,
                title: "Failed to toggle favorite",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              });
            }
          }}
        />
        <ActionPanel.Submenu
          title="Move to Project\u2026"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        >
          {projects
            .filter((p) => p.id !== task.project_id)
            .map((p) => (
              <Action
                key={p.id}
                title={p.title}
                onAction={async () => {
                  try {
                    await updateTask(task.id, { project_id: p.id });
                    showToast({
                      style: Toast.Style.Success,
                      title: `Moved to ${p.title}`,
                    });
                    onRefresh();
                  } catch (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to move task",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                    });
                  }
                }}
              />
            ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Task Title"
          content={task.title}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Task URL"
          content={`${baseUrl}/tasks/${task.id}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={onRefresh}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action
          title="Delete Task"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => onDelete(task)}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
