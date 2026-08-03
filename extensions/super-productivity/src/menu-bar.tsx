import { useState, useEffect, useRef } from "react";
import { MenuBarExtra, Icon, Color, launchCommand, LaunchType } from "@raycast/api";
import { getCurrentTask, stopCurrentTask, getTasks, startTask } from "./api";
import type { CurrentTask, Task } from "./types";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatMenuBarTitle(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function truncateTitle(title: string, maxLen: number): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 1) + "…";
}

export default function Command() {
  const [currentTask, setCurrentTaskState] = useState<CurrentTask | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const currentTaskRef = useRef<CurrentTask | null>(null);

  async function fetchCurrentTask() {
    try {
      const [task, tasks] = await Promise.all([getCurrentTask(), getTasks({ source: "active" })]);

      setElapsedMs(task ? Object.values(task.timeSpentOnDay).reduce((s, v) => s + v, 0) : 0);
      startTimeRef.current = Date.now();
      currentTaskRef.current = task;
      setCurrentTaskState(task);
      setRecentTasks(tasks.slice(0, 10));
    } catch (e) {
      console.error("Menu bar fetch failed:", e);
    } finally {
      setIsLoading(false);
    }
  }

  // Poll API every 30 seconds
  useEffect(() => {
    fetchCurrentTask();
    const id = setInterval(fetchCurrentTask, 30000);
    return () => clearInterval(id);
  }, []);

  // Update elapsed time display every second (runs once, reads from ref)
  useEffect(() => {
    const id = setInterval(() => {
      const task = currentTaskRef.current;
      if (task) {
        const since = Date.now() - startTimeRef.current;
        setElapsedMs(Object.values(task.timeSpentOnDay).reduce((s, v) => s + v, 0) + since);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  async function handleStop() {
    try {
      await stopCurrentTask();
      currentTaskRef.current = null;
      setCurrentTaskState(null);
      setElapsedMs(0);
    } catch (e) {
      console.error("Failed to stop task:", e);
    }
  }

  async function handleStartTask(taskId: string) {
    try {
      await startTask(taskId);
      await fetchCurrentTask();
    } catch (e) {
      console.error("Failed to start task:", e);
    }
  }

  const title = currentTask ? `${truncateTitle(currentTask.title, 20)} ${formatMenuBarTitle(elapsedMs)}` : "⏸";

  const icon = currentTask ? { source: Icon.Play, tintColor: Color.Green } : { source: Icon.Stop };

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      isLoading={isLoading}
      tooltip={currentTask ? `Tracking: ${currentTask.title}` : "Not tracking any task"}
    >
      <MenuBarExtra.Section title={currentTask ? "Currently Tracking" : "Not Tracking"}>
        {currentTask ? (
          <MenuBarExtra.Item
            title={currentTask.title}
            subtitle={`Total today: ${formatTime(elapsedMs)}`}
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            onAction={handleStop}
          />
        ) : (
          <MenuBarExtra.Item
            title="No task tracked"
            icon={Icon.Clock}
            onAction={async () => {
              await launchCommand({
                name: "current-task",
                type: LaunchType.UserInitiated,
              });
            }}
          />
        )}
      </MenuBarExtra.Section>

      {currentTask && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Stop Tracking" icon={Icon.Stop} onAction={handleStop} />
        </MenuBarExtra.Section>
      )}

      {recentTasks.filter((t) => t.id !== currentTask?.id).length > 0 && (
        <MenuBarExtra.Section title="Start Tracking">
          {recentTasks
            .filter((t) => t.id !== currentTask?.id)
            .map((task) => (
              <MenuBarExtra.Item
                key={task.id}
                title={task.title}
                icon={Icon.Circle}
                onAction={() => handleStartTask(task.id)}
              />
            ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Current Task View"
          icon={Icon.Window}
          onAction={async () => {
            await launchCommand({
              name: "current-task",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Quick Add Task"
          icon={Icon.Plus}
          onAction={async () => {
            await launchCommand({
              name: "quick-add",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchCurrentTask} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
