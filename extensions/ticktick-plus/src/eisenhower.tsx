import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { isToday, isTomorrow, parseISO } from "date-fns";
import { useSync } from "./hooks/useSync";
import { completeTask, deleteTask, uncompleteTask } from "./api/tasks";
import { Task } from "./types/ticktick";

type Quadrant = "ui" | "uni" | "nui" | "nuni";

const QUADRANTS = {
  ui: { title: "Urgent & Important", subtitle: "Do First", color: Color.Red, icon: Icon.ExclamationMark },
  nui: { title: "Not Urgent & Important", subtitle: "Schedule", color: Color.Blue, icon: Icon.Star },
  uni: { title: "Urgent & Not Important", subtitle: "Delegate", color: Color.Orange, icon: Icon.Clock },
  nuni: { title: "Not Urgent & Not Important", subtitle: "Eliminate", color: Color.SecondaryText, icon: Icon.Minus },
};

function classifyTask(task: Task): Quadrant {
  const isUrgent = (() => {
    if (!task.dueDate) return false;
    try {
      const d = parseISO(task.dueDate);
      return isToday(d) || isTomorrow(d) || d < new Date();
    } catch {
      return false;
    }
  })();
  const isImportant = task.priority >= 3;
  if (isUrgent && isImportant) return "ui";
  if (!isUrgent && isImportant) return "nui";
  if (isUrgent && !isImportant) return "uni";
  return "nuni";
}

export default function EisenhowerMatrix() {
  const { data, isLoading, revalidate } = useSync();
  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));

  const grouped: Record<Quadrant, Task[]> = { ui: [], uni: [], nui: [], nuni: [] };
  for (const task of data.tasks) grouped[classifyTask(task)].push(task);

  return (
    <List isLoading={isLoading} navigationTitle="Eisenhower Matrix" searchBarPlaceholder="Filter tasks...">
      {(["ui", "nui", "uni", "nuni"] as Quadrant[]).map((q) => {
        const { title, subtitle, color, icon } = QUADRANTS[q];
        return (
          <List.Section key={q} title={title} subtitle={`${subtitle} · ${grouped[q].length} tasks`}>
            {grouped[q].map((task) => {
              let dueText = "";
              if (task.dueDate) {
                try {
                  dueText = parseISO(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                } catch {
                  /**/
                }
              }
              return (
                <List.Item
                  key={task.id}
                  icon={{ source: icon, tintColor: color }}
                  title={task.title}
                  subtitle={projectMap.get(task.projectId)}
                  accessories={dueText ? [{ text: dueText, icon: Icon.Calendar }] : []}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Complete Task"
                        icon={Icon.Checkmark}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                        onAction={async () => {
                          let undone = false;
                          try {
                            await completeTask(task.projectId, task.id);
                          } catch (err) {
                            await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                            return;
                          }
                          revalidate();
                          const toast = await showToast({
                            style: Toast.Style.Success,
                            title: "Task completed",
                            message: task.title.slice(0, 40),
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
                                  t.title = "Restored";
                                  revalidate();
                                } catch (e) {
                                  t.style = Toast.Style.Failure;
                                  t.title = "Undo failed";
                                  t.message = String(e);
                                }
                              },
                            },
                          });
                          await new Promise<void>((r) => setTimeout(r, 10000));
                          if (!undone) toast.hide();
                        }}
                      />
                      <Action.OpenInBrowser
                        title="Open in TickTick"
                        url={`https://ticktick.com/webapp/#p/${task.projectId}/tasks/${task.id}`}
                      />
                      <Action
                        title="Delete Task"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={async () => {
                          try {
                            await deleteTask(task.projectId, task.id);
                            revalidate();
                          } catch (err) {
                            await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                          }
                        }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
