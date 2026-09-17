import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { getCurrentTask, startTask, stopCurrentTask, getTasks } from "./api";
import type { CurrentTask, Task } from "./types";

export default function Command() {
  const [currentTask, setCurrentTaskState] = useState<CurrentTask | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  async function fetchData() {
    setIsLoading(true);
    setHasError(false);
    try {
      const [task, tasks] = await Promise.all([getCurrentTask(), getTasks({ source: "active" })]);
      setCurrentTaskState(task);
      setRecentTasks(tasks.slice(0, 20));
    } catch (e) {
      console.error("Failed to fetch current task:", e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleStartTask(taskId: string) {
    try {
      await startTask(taskId);
      await fetchData();
    } catch (e) {
      console.error("Failed to start task:", e);
    }
  }

  async function handleStopTask() {
    try {
      await stopCurrentTask();
      fetchData();
    } catch (e) {
      console.error("Failed to stop task:", e);
    }
  }

  if (hasError) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load tasks"
          description="Make sure Super Productivity is running and its Local REST API is enabled."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tasks to start...">
      {/* Current Task Section */}
      <List.Section title={currentTask ? "Currently Tracking" : "Not Tracking"}>
        {currentTask ? (
          <List.Item
            key="current"
            title={currentTask.title}
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            accessories={[
              {
                text: `${(Object.values(currentTask.timeSpentOnDay).reduce((s, v) => s + v, 0) / 3600000).toFixed(1)}h today`,
                icon: Icon.Clock,
              },
              {
                text: `${(currentTask.timeSpent / 3600000).toFixed(1)}h total`,
                icon: Icon.BarChart,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Stop Tracking"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    onAction={handleStopTask}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={fetchData}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ) : (
          <List.Item key="none" title="No task currently tracked" icon={Icon.Clock} />
        )}
      </List.Section>

      {/* Available Tasks */}
      {recentTasks.filter((t) => t.id !== currentTask?.id).length > 0 && (
        <List.Section title="Start Tracking">
          {recentTasks
            .filter((t) => t.id !== currentTask?.id)
            .map((task) => (
              <List.Item
                key={task.id}
                title={task.title}
                icon={Icon.List}
                accessories={[
                  ...(task.timeEstimate > 0
                    ? [
                        {
                          text: `${task.timeEstimate / 3600000}h`,
                          icon: Icon.Clock,
                        },
                      ]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={
                        task.timeSpent > 0
                          ? `Resume Tracking (${(task.timeSpent / 3600000).toFixed(1)}h spent)`
                          : "Start Tracking"
                      }
                      icon={task.timeSpent > 0 ? Icon.ArrowClockwise : Icon.Play}
                      onAction={() => handleStartTask(task.id)}
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
