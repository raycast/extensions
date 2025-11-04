import { ActionPanel, Action, List, Icon, Color, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getClient } from "./api/client";
import { formatTimeRemaining } from "./utils/formatters";
import { Task } from "./api/types";

interface PomodoroStatus {
  isRunning: boolean;
  timeRemaining: number;
  currentSession?: {
    id: string;
    type: string;
    duration: number;
    startTime: string;
  };
  totalPomodoros: number;
  currentStreak: number;
  totalMinutesToday: number;
}

export default function PomodoroTimer() {
  const [status, setStatus] = useState<PomodoroStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = getClient();

      // Check API health first
      try {
        await client.checkHealth();
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "API Connection Failed",
          message: "Make sure TaskNotes API is running in Obsidian",
        });
        setIsLoading(false);
        return;
      }

      const response = await client.getPomodoroStatus();

      if (response.success && response.data) {
        setStatus(response.data);
      } else {
        throw new Error(response.error || "Failed to load pomodoro status");
      }

      // Load open tasks for starting pomodoro
      const tasksResponse = await client.listTasks();

      if (tasksResponse.success && tasksResponse.data) {
        setTasks(tasksResponse.data.tasks);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Refresh every 10 seconds when running
    const interval = setInterval(() => {
      if (status?.isRunning) {
        loadStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [status?.isRunning, loadStatus]);

  const handleStart = async (taskId?: string) => {
    try {
      const client = getClient();
      const response = await client.startPomodoro(taskId);

      if (response.success) {
        showToast({
          style: Toast.Style.Success,
          title: "Pomodoro Started",
          message: response.data?.message,
        });
        await loadStatus();
      } else {
        throw new Error(response.error || "Failed to start pomodoro");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Action Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleStop = async () => {
    try {
      const client = getClient();
      const response = await client.stopPomodoro();

      if (response.success) {
        showToast({
          style: Toast.Style.Success,
          title: "Pomodoro Stopped",
        });
        await loadStatus();
      } else {
        throw new Error(response.error || "Failed to stop pomodoro");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Action Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handlePause = async () => {
    try {
      const client = getClient();
      const response = await client.pausePomodoro();

      if (response.success) {
        showToast({
          style: Toast.Style.Success,
          title: "Pomodoro Paused",
        });
        await loadStatus();
      } else {
        throw new Error(response.error || "Failed to pause pomodoro");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Action Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleResume = async () => {
    try {
      const client = getClient();
      const response = await client.resumePomodoro();

      if (response.success) {
        showToast({
          style: Toast.Style.Success,
          title: "Pomodoro Resumed",
        });
        await loadStatus();
      } else {
        throw new Error(response.error || "Failed to resume pomodoro");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Action Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getStatusIcon = () => {
    if (!status) return Icon.Clock;
    if (status.isRunning) {
      return { source: Icon.Play, tintColor: Color.Green };
    }
    return { source: Icon.Stop, tintColor: Color.Red };
  };

  const getStatusTitle = () => {
    if (!status) return "Loading...";
    if (status.isRunning && status.currentSession) {
      return `Pomodoro Running - ${formatTimeRemaining(status.timeRemaining)}`;
    }
    return "No Active Pomodoro";
  };

  const getStatusSubtitle = () => {
    if (!status) return "";

    const parts = [];
    if (status.currentSession) {
      parts.push(`Session: ${status.currentSession.type}`);
    }
    parts.push(`Today: ${status.totalPomodoros} pomodoros`);
    parts.push(`Streak: ${status.currentStreak}`);

    return parts.join(" • ");
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Current Status">
        <List.Item
          icon={getStatusIcon()}
          title={getStatusTitle()}
          subtitle={getStatusSubtitle()}
          actions={
            <ActionPanel>
              {status?.isRunning ? (
                <>
                  <Action title="Stop Pomodoro" icon={Icon.Stop} onAction={handleStop} />
                  <Action title="Pause Pomodoro" icon={Icon.Pause} onAction={handlePause} />
                </>
              ) : (
                <>
                  <Action title="Start Pomodoro" icon={Icon.Play} onAction={() => handleStart()} />
                  {status?.currentSession && (
                    <Action title="Resume Pomodoro" icon={Icon.Play} onAction={handleResume} />
                  )}
                  <Action.Push
                    title="Start with Task"
                    icon={Icon.List}
                    target={<SelectTaskForm tasks={tasks} onStart={handleStart} />}
                  />
                </>
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={loadStatus}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {status && (
        <List.Section title="Statistics">
          <List.Item
            icon={Icon.Checkmark}
            title="Total Pomodoros Today"
            accessories={[{ text: status.totalPomodoros.toString() }]}
          />
          <List.Item
            icon={Icon.Bolt}
            title="Current Streak"
            accessories={[{ text: status.currentStreak.toString() }]}
          />
          <List.Item
            icon={Icon.Clock}
            title="Total Minutes Today"
            accessories={[{ text: status.totalMinutesToday.toString() }]}
          />
        </List.Section>
      )}
    </List>
  );
}

// Component to select a task for starting pomodoro
function SelectTaskForm({ tasks, onStart }: { tasks: Task[]; onStart: (taskId: string) => Promise<void> }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { taskId: string }) => {
    if (!values.taskId) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a task",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onStart(values.taskId);
      pop();
    } catch {
      // Error already handled in onStart
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Pomodoro" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="taskId" title="Select Task" autoFocus>
        {tasks.map((task) => (
          <Form.Dropdown.Item key={task.path} value={task.path} title={task.title} icon={Icon.Document} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
