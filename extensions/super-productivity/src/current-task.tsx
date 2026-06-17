import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import {
  getCurrentTask,
  setCurrentTask,
  stopCurrentTask,
  getTasks,
} from "./api";
import type { CurrentTask, Task } from "./types";

export default function Command() {
  const [currentTask, setCurrentTaskState] = useState<CurrentTask | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetch() {
    setIsLoading(true);
    try {
      const [task, tasks] = await Promise.all([
        getCurrentTask(),
        getTasks({ source: "active" }),
      ]);
      setCurrentTaskState(task);
      setRecentTasks(tasks.slice(0, 20));
    } catch (e) {
      console.error("Failed to fetch current task:", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetch();
  }, []);

  async function handleStartTask(taskId: string) {
    try {
      await setCurrentTask(taskId);
      fetch();
    } catch (e) {
      console.error("Failed to start task:", e);
    }
  }

  async function handleStopTask() {
    try {
      await stopCurrentTask();
      fetch();
    } catch (e) {
      console.error("Failed to stop task:", e);
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Current Task"
      searchBarPlaceholder="Search tasks to start..."
    >
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
                    onAction={fetch}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            key="none"
            title="No task currently tracked"
            icon={Icon.Clock}
          />
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
                          ? `Resume Tracking (+ Focus Session) (${(task.timeSpent / 3600000).toFixed(1)}h spent)`
                          : "Start Tracking (+ Focus Session)"
                      }
                      icon={
                        task.timeSpent > 0 ? Icon.ArrowClockwise : Icon.Play
                      }
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
