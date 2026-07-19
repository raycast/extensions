import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Task, Project, PRIORITY_LABELS, PRIORITY_COLORS } from "../types/ticktick";
import { completeTask, toggleSubtask, moveTask } from "../api/tasks";
import { getComments, addComment, deleteComment } from "../api/ticktick";
import { EditTaskForm } from "./EditTaskForm";
import { format, parseISO } from "date-fns";
import { Clipboard } from "@raycast/api";

interface Props {
  task: Task;
  projects: Project[];
  projectName?: string;
  onMutate: () => void;
}

function formatDueDate(dueDate?: string): string | undefined {
  if (!dueDate) return undefined;
  try {
    return format(parseISO(dueDate), "MMM d, yyyy");
  } catch {
    return undefined;
  }
}

export function TaskDetail({ task, projects, projectName, onMutate }: Props) {
  const { data: comments, revalidate: reloadComments } = useCachedPromise(
    (projectId: string, taskId: string) => getComments(projectId, taskId),
    [task.projectId, task.id],
  );

  async function handleComplete() {
    try {
      await completeTask(task.projectId, task.id);
      await showToast({ style: Toast.Style.Success, title: "Task completed" });
      onMutate();
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
    }
  }

  const otherProjects = projects.filter((p) => p.id !== task.projectId && !p.closed);

  return (
    <List navigationTitle={task.title} searchBarPlaceholder="Filter...">
      <List.Section title="Details">
        <List.Item
          icon={Icon.Info}
          title={task.title}
          subtitle={task.content}
          accessories={[
            ...(task.priority > 0
              ? [{ text: { value: PRIORITY_LABELS[task.priority], color: PRIORITY_COLORS[task.priority] as Color } }]
              : []),
            ...(formatDueDate(task.dueDate) ? [{ text: formatDueDate(task.dueDate)!, icon: Icon.Calendar }] : []),
            ...(projectName ? [{ text: projectName, icon: Icon.Folder }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Task"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditTaskForm task={task} onSave={onMutate} />}
              />
              <Action title="Complete" icon={Icon.Checkmark} onAction={handleComplete} />
              <Action.OpenInBrowser
                title="Open in TickTick"
                url={`https://ticktick.com/webapp/#p/${task.projectId}/tasks/${task.id}`}
              />
            </ActionPanel>
          }
        />
        {task.tags && task.tags.length > 0 && (
          <List.Item icon={Icon.Tag} title="Tags" subtitle={task.tags.join(", ")} />
        )}
      </List.Section>

      {task.items && task.items.length > 0 && (
        <List.Section title={`Checklist · ${task.items.filter((i) => i.status === 2).length}/${task.items.length}`}>
          {task.items.map((item) => (
            <List.Item
              key={item.id}
              icon={item.status === 2 ? Icon.Checkmark : Icon.Circle}
              title={item.title}
              actions={
                <ActionPanel>
                  <Action
                    title={item.status === 2 ? "Mark Incomplete" : "Mark Complete"}
                    icon={item.status === 2 ? Icon.Circle : Icon.Checkmark}
                    onAction={async () => {
                      try {
                        await toggleSubtask(task, item.id, item.status !== 2);
                        onMutate();
                      } catch (err) {
                        await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title={`Comments · ${comments?.length ?? 0}`}>
        {(comments ?? []).map((c) => (
          <List.Item
            key={c.id}
            icon={Icon.SpeechBubble}
            title={c.title}
            subtitle={c.createdTime ? format(parseISO(c.createdTime), "MMM d, h:mm a") : undefined}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Comment"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    try {
                      await deleteComment(task.projectId, task.id, c.id);
                      reloadComments();
                    } catch (err) {
                      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          icon={Icon.Plus}
          title="Add Comment from Clipboard"
          actions={
            <ActionPanel>
              <Action
                title="Paste Clipboard as Comment"
                onAction={async () => {
                  const text = await Clipboard.readText();
                  if (!text) {
                    await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
                    return;
                  }
                  try {
                    await addComment(task.projectId, task.id, text);
                    reloadComments();
                    await showToast({ style: Toast.Style.Success, title: "Comment added" });
                  } catch (err) {
                    await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {otherProjects.length > 0 && (
        <List.Section title="Move to Project">
          {otherProjects.slice(0, 15).map((p) => (
            <List.Item
              key={p.id}
              icon={Icon.ArrowRight}
              title={p.name}
              actions={
                <ActionPanel>
                  <Action
                    title={`Move to ${p.name}`}
                    onAction={async () => {
                      try {
                        await moveTask(task.projectId, p.id, task.id);
                        await showToast({ style: Toast.Style.Success, title: `Moved to ${p.name}` });
                        onMutate();
                      } catch (err) {
                        await showToast({ style: Toast.Style.Failure, title: "Move failed", message: String(err) });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
