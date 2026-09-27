import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { katoApi } from "./api";
import { groupTasks, type TaskGroup } from "./dates";
import { ErrorActions } from "./error-actions";
import { accessTokenOptions } from "./oauth";
import { TaskActions } from "./task-actions";
import type { Task, TaskStatus } from "./types";

const GROUPS: TaskGroup[] = ["Overdue", "Today", "Upcoming", "Unscheduled"];

function priorityAccessory(task: Task): List.Item.Accessory | null {
  if (task.priority === "no_priority") return null;
  const color =
    task.priority === "urgent"
      ? Color.Red
      : task.priority === "high"
        ? Color.Orange
        : Color.SecondaryText;
  return { tag: { value: task.priority.replace("_", " "), color } };
}

function MyTasksCommand() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function load() {
    setIsLoading(true);
    setError(undefined);
    try {
      const [nextTasks, nextStatuses] = await Promise.all([
        katoApi.tasks(),
        katoApi.statuses(),
      ]);
      setTasks(nextTasks);
      setStatuses(nextStatuses);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => void load(), []);
  const grouped = useMemo(() => groupTasks(tasks), [tasks]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter my tasks…">
      {error ? (
        <List.EmptyView
          title="Could not load tasks"
          description={error}
          icon={Icon.Warning}
          actions={
            <ErrorActions command="my-tasks" onRetry={() => void load()} />
          }
        />
      ) : null}
      {!error && !isLoading && tasks.length === 0 ? (
        <List.EmptyView
          title="You’re all caught up"
          description="No open tasks are assigned to you."
          icon={Icon.CheckCircle}
        />
      ) : null}
      {GROUPS.map((group) =>
        grouped[group].length ? (
          <List.Section
            key={group}
            title={group}
            subtitle={`${grouped[group].length}`}
          >
            {grouped[group].map((task) => {
              const due = task.dueDate
                ? `Due ${new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(task.dueDate))}`
                : undefined;
              const priority = priorityAccessory(task);
              const isOverdue =
                Boolean(task.dueDate) && Date.parse(task.dueDate!) < Date.now();
              return (
                <List.Item
                  key={task.id}
                  icon={
                    group === "Overdue"
                      ? { source: Icon.Clock, tintColor: Color.Red }
                      : Icon.Circle
                  }
                  title={task.title}
                  accessories={[
                    ...(priority ? [priority] : []),
                    ...(due
                      ? [
                          {
                            text: {
                              value: due,
                              color: isOverdue
                                ? Color.Red
                                : Color.SecondaryText,
                            },
                          } as List.Item.Accessory,
                        ]
                      : []),
                    ...(task.fileCount
                      ? [
                          {
                            icon: Icon.Document,
                            text: String(task.fileCount),
                          } as List.Item.Accessory,
                        ]
                      : []),
                    ...(task.linkedRecordCount
                      ? [
                          {
                            icon: Icon.Link,
                            text: String(task.linkedRecordCount),
                          } as List.Item.Accessory,
                        ]
                      : []),
                    {
                      icon: Icon.Person,
                      text: String(task.assignees.length),
                    },
                  ]}
                  actions={
                    <TaskActions
                      task={task}
                      statuses={statuses}
                      onBeforeComplete={() =>
                        setTasks((current) =>
                          current.filter((item) => item.id !== task.id),
                        )
                      }
                      onCompleteError={() =>
                        setTasks((current) =>
                          current.some((item) => item.id === task.id)
                            ? current
                            : [...current, task],
                        )
                      }
                      onCompleted={(completed, previousStatus) => ({
                        undo: async () => {
                          try {
                            const restored = await katoApi.updateTask(
                              completed.id,
                              { status: previousStatus },
                            );
                            setTasks((current) =>
                              current.some((item) => item.id === restored.id)
                                ? current
                                : [...current, restored],
                            );
                            await showToast({
                              style: Toast.Style.Success,
                              title: "Completion undone",
                            });
                          } catch (cause) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Could not undo",
                              message: (cause as Error).message,
                            });
                          }
                        },
                      })}
                      onUpdated={(updated) =>
                        setTasks((current) =>
                          current.map((item) =>
                            item.id === updated.id ? updated : item,
                          ),
                        )
                      }
                    />
                  }
                />
              );
            })}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}

export default withAccessToken(accessTokenOptions)(MyTasksCommand);
