import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  popToRoot,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import {
  getCompletedTasks,
  deleteTask,
  getCurrentTask,
  cleanupTasks,
  startTask,
  stopCurrentTask,
  updateTaskCalendar,
} from "./storage";
import { exportToCalendar, getCalendarsWithColors } from "./calendar";
import { formatDuration, formatDateTime, getElapsedTime } from "./utils";
import { Task, CalendarInfo } from "./types";
import StartTimer from "./start-timer";

export default function TaskHistory() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await cleanupTasks();
      const [completed, current] = await Promise.all([getCompletedTasks(), getCurrentTask()]);

      if (!cancelled) {
        setTasks(completed);
        setCurrentTask(current);
        if (current && current.isRunning) {
          setElapsedTime(getElapsedTime(current.startTime));
        }
        setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (currentTask && currentTask.isRunning) {
      const interval = setInterval(() => {
        setElapsedTime(getElapsedTime(currentTask.startTime));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentTask]);

  async function loadTasks() {
    // Auto cleanup old tasks
    await cleanupTasks();

    const [completed, current] = await Promise.all([getCompletedTasks(), getCurrentTask()]);
    setTasks(completed);
    setCurrentTask(current);
    if (current && current.isRunning) {
      setElapsedTime(getElapsedTime(current.startTime));
    }
    // Note: setIsLoading is handled by the useEffect for initial load
  }

  async function handleExport(task: Task) {
    const success = await exportToCalendar(task);
    if (success) {
      await loadTasks();
    }
  }

  async function handleDelete(task: Task) {
    const confirmed = await confirmAlert({
      title: "Delete Task",
      message: `Are you sure you want to delete "${task.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteTask(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Task Deleted",
      });
      await loadTasks();
    }
  }

  async function handleStartTimer(task: Task) {
    // If there's a running task, stop it first (and export if it has a calendar)
    if (currentTask && currentTask.isRunning) {
      const stoppedTask = await stopCurrentTask();
      if (stoppedTask && stoppedTask.calendarName) {
        await exportToCalendar(stoppedTask);
      }
    }

    const newTask = await startTask(
      task.name,
      task.calendarId,
      task.calendarName,
      task.accountName,
      task.notes,
      task.url,
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Timer Started",
      message: `Started tracking "${newTask.name}"${newTask.calendarName ? ` → ${newTask.calendarName}` : ""}`,
    });
    await popToRoot();
  }

  async function handleStop() {
    const stoppedTask = await stopCurrentTask();
    if (stoppedTask) {
      // Auto-export if calendar is attached
      if (stoppedTask.calendarName) {
        await exportToCalendar(stoppedTask);
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Timer Stopped",
        message: `"${stoppedTask.name}" - ${formatDuration(stoppedTask.duration || 0)}`,
      });
      await loadTasks();
    }
  }

  return (
    <List isLoading={isLoading}>
      {currentTask && currentTask.isRunning ? (
        <List.Section title="Currently Running">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            title={currentTask.name}
            subtitle={formatDuration(elapsedTime)}
            accessories={
              [
                currentTask.accountName ? { text: currentTask.accountName } : null,
                currentTask.calendarName ? { tag: currentTask.calendarName } : null,
                { text: formatDateTime(currentTask.startTime) },
                { icon: { source: Icon.Play, tintColor: Color.Green }, tooltip: "Running" },
              ].filter(Boolean) as List.Item.Accessory[]
            }
            actions={
              <ActionPanel>
                <Action
                  title={currentTask.calendarName ? "Stop & Export to Calendar" : "Stop Timer"}
                  icon={Icon.Stop}
                  onAction={handleStop}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <List.Section title="Quick Actions">
          <List.Item
            icon={{ source: Icon.Play, tintColor: Color.Blue }}
            title="Start New Timer"
            subtitle="Begin tracking a new task"
            actions={
              <ActionPanel>
                <Action.Push title="Start Timer" icon={Icon.Play} target={<StartTimer />} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Completed Tasks">
        {tasks.length === 0 ? (
          <List.Item
            icon={Icon.Document}
            title="No completed tasks yet"
            subtitle="Start a timer and complete some tasks"
          />
        ) : (
          tasks.map((task) => (
            <List.Item
              key={task.id}
              icon={{
                source: task.exportedToCalendar ? Icon.CheckCircle : Icon.Circle,
                tintColor: task.exportedToCalendar ? Color.Green : Color.SecondaryText,
              }}
              title={task.name}
              subtitle={formatDuration(task.duration || 0)}
              accessories={
                [
                  task.accountName ? { text: task.accountName } : null,
                  { tag: task.calendarName || "No export" },
                  { text: formatDateTime(task.startTime) },
                  task.calendarName
                    ? task.exportedToCalendar
                      ? { icon: Icon.Calendar, tooltip: "Exported to Calendar" }
                      : { icon: Icon.Calendar, tooltip: "Not exported" }
                    : null,
                ].filter(Boolean) as List.Item.Accessory[]
              }
              actions={
                <ActionPanel>
                  <Action title="Start Timer" icon={Icon.Play} onAction={() => handleStartTimer(task)} />
                  {task.calendarName && !task.exportedToCalendar && (
                    <Action title="Export to Calendar" icon={Icon.Calendar} onAction={() => handleExport(task)} />
                  )}
                  {!task.calendarName && (
                    <Action.Push
                      title="Assign Calendar & Export"
                      icon={Icon.Calendar}
                      target={<AssignCalendarForm task={task} onComplete={loadTasks} />}
                    />
                  )}
                  <Action
                    title="Delete Task"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(task)}
                  />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadTasks} />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}

// Form for assigning a calendar to a task without one and exporting
function AssignCalendarForm({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const { pop } = useNavigation();
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Group calendars by account name
  const calendarsByAccount = useMemo(() => {
    const grouped = new Map<string, CalendarInfo[]>();
    for (const cal of calendars) {
      const account = cal.accountName || "Other";
      if (!grouped.has(account)) grouped.set(account, []);
      grouped.get(account)!.push(cal);
    }
    return grouped;
  }, [calendars]);

  useEffect(() => {
    let cancelled = false;

    async function loadCalendars() {
      const calendarInfos = await getCalendarsWithColors();
      if (!cancelled) {
        setCalendars(calendarInfos);
        if (calendarInfos.length > 0) {
          setSelectedCalendarId(calendarInfos[0].id);
        }
        setIsLoading(false);
      }
    }
    loadCalendars();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId);
    if (!selectedCalendar) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a calendar",
      });
      return;
    }

    // Update task with calendar info
    const updatedTask = await updateTaskCalendar(
      task.id,
      selectedCalendar.id,
      selectedCalendar.name,
      selectedCalendar.accountName,
    );

    if (updatedTask) {
      // Export to calendar
      await exportToCalendar(updatedTask);
      onComplete();
      pop();
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Assign Calendar: ${task.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Assign & Export" icon={Icon.Calendar} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Task: ${task.name}`} />
      <Form.Description text={`Duration: ${formatDuration(task.duration || 0)}`} />
      <Form.Dropdown id="calendarId" title="Calendar" value={selectedCalendarId} onChange={setSelectedCalendarId}>
        {Array.from(calendarsByAccount.entries()).map(([accountName, cals]) => (
          <Form.Dropdown.Section key={accountName} title={accountName}>
            {cals.map((cal) => (
              <Form.Dropdown.Item key={cal.id} value={cal.id} title={cal.name} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
    </Form>
  );
}
