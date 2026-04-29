import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  open,
  PopToRootType,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getTasks, removeTask, updateTask, type Task } from "./storage";
import {
  getTaskStatus,
  getSkillOptionsForCommand,
  launchTask,
  readTaskOutput,
  stopTask,
} from "./task-manager";
import { extractGitUrl, extractReviewReport, TaskDetail } from "./task-detail";

function getTaskIcon(status: Task["status"]) {
  switch (status) {
    case "running":
      return Icon.CircleProgress;
    case "completed":
      return Icon.CheckCircle;
    case "stopped":
    case "canceled":
      return Icon.Stop;
    case "failed":
      return Icon.XMarkCircle;
  }
}

function getStatusLabel(status: Task["status"]): string {
  switch (status) {
    case "running":
      return "running";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "stopped":
    case "canceled":
      return "canceled";
  }
}

export default function ViewTasks() {
  const { push } = useNavigation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = await getTasks();
    const updated = await Promise.all(
      t.map(async (task) => {
        const status = getTaskStatus(task);
        if (status !== task.status) {
          await updateTask(task.id, { status });
          return { ...task, status };
        }
        return task;
      }),
    );
    setTasks(updated);
    setIsLoading(false);
  }, []);

  const handleStop = useCallback(
    async (task: Task) => {
      await showToast({
        style: Toast.Style.Animated,
        title: "Stopping task...",
      });
      await stopTask(task);
      await refresh();
      await showToast({ style: Toast.Style.Success, title: "Task canceled" });
    },
    [refresh],
  );

  const handleRemove = useCallback(
    async (task: Task) => {
      await removeTask(task.id);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
    const hasRunning = tasks.some((t) => t.status === "running");
    const interval = hasRunning ? 3000 : 30000;
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [refresh, tasks]);

  const running = tasks.filter((t) => t.status === "running");
  const finished = tasks.filter((t) => t.status !== "running");

  return (
    <List isLoading={isLoading}>
      {running.length > 0 && (
        <List.Section title="Running">
          {running.map((task) => (
            <List.Item
              key={task.id}
              icon={getTaskIcon(task.status)}
              title={task.label}
              subtitle={task.dir}
              accessories={[
                { text: new Date(task.startTime).toLocaleTimeString() },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    onAction={() => push(<TaskDetail task={task} allowClear />)}
                  />
                  <Action
                    title="Stop Task"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    onAction={() => void handleStop(task)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {finished.length > 0 && (
        <List.Section title="Finished">
          {finished.map((task) => {
            const output =
              task.status === "completed" ? readTaskOutput(task) : "";
            const gitUrl =
              task.status === "completed" ? extractGitUrl(task, output) : null;
            const reviewReport =
              task.status === "completed" && task.command === "review-pr"
                ? extractReviewReport(output)
                : null;

            function handleRerunReview() {
              if (!task.prUrl) return;
              void (async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Re-running review...",
                });
                try {
                  const skillOpts =
                    await getSkillOptionsForCommand("review-pr");
                  const newTask = await launchTask(
                    "review-pr",
                    task.dir,
                    task.label,
                    {
                      prUrl: task.prUrl,
                      ...skillOpts,
                    },
                  );
                  if (!newTask) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "No skill file configured";
                    toast.message =
                      "Please configure one via Manage Folders & Skills";
                    return;
                  }
                  toast.style = Toast.Style.Success;
                  toast.title = "PR review task started";
                  push(
                    <TaskDetail
                      task={newTask}
                      onRerunReview={handleRerunReview}
                    />,
                  );
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to start PR review";
                  toast.message =
                    error instanceof Error ? error.message : String(error);
                }
              })();
            }

            return (
              <List.Item
                key={task.id}
                icon={getTaskIcon(task.status)}
                title={task.label}
                subtitle={task.dir}
                accessories={[
                  ...(reviewReport
                    ? [{ icon: Icon.Document, text: "Report" }]
                    : []),
                  { text: getStatusLabel(task.status) },
                  { text: new Date(task.startTime).toLocaleTimeString() },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Details"
                      icon={Icon.Eye}
                      onAction={() =>
                        push(
                          <TaskDetail
                            task={task}
                            allowClear
                            onRerunReview={
                              task.command === "review-pr" && task.prUrl
                                ? handleRerunReview
                                : undefined
                            }
                          />,
                        )
                      }
                    />
                    {gitUrl && (
                      <>
                        <Action.CopyToClipboard
                          title="Copy Git Link"
                          content={gitUrl}
                          shortcut={{ modifiers: ["cmd"], key: "enter" }}
                        />
                        <Action
                          title="Open Git Link"
                          icon={Icon.Link}
                          shortcut={{ modifiers: ["cmd"], key: "o" }}
                          onAction={() => {
                            void open(gitUrl);
                            void closeMainWindow({
                              clearRootSearch: true,
                              popToRootType: PopToRootType.Immediate,
                            });
                          }}
                        />
                      </>
                    )}
                    {task.prUrl && !gitUrl && (
                      <>
                        <Action.CopyToClipboard
                          title="Copy Pr Link"
                          content={task.prUrl}
                          shortcut={{ modifiers: ["cmd"], key: "enter" }}
                        />
                        <Action
                          title="Open Pr Link"
                          icon={Icon.Link}
                          shortcut={{ modifiers: ["cmd"], key: "o" }}
                          onAction={() => {
                            void open(task.prUrl!);
                            void closeMainWindow({
                              clearRootSearch: true,
                              popToRootType: PopToRootType.Immediate,
                            });
                          }}
                        />
                      </>
                    )}
                    <Action
                      title="Remove"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => void handleRemove(task)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {tasks.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Tasks"
          description="Run git-push, create-pr, or review-pr to start a task"
        />
      )}
    </List>
  );
}
