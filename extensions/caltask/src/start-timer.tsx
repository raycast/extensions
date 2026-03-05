import { Action, ActionPanel, Form, Detail, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { startTask, getCurrentTask, stopCurrentTask, getRecentTaskSuggestions, TaskSuggestion } from "./storage";
import { getCalendarsWithColors, exportToCalendar } from "./calendar";
import { CalendarInfo } from "./types";
import { formatDuration, getElapsedTime, formatDateTime } from "./utils";
import { Task } from "./types";

// Helper function to validate URL format
function isValidUrl(string: string): boolean {
  if (!string) return true; // Optional field
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export default function StartTimer() {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentTask();
  }, []);

  async function loadCurrentTask() {
    const task = await getCurrentTask();
    setCurrentTask(task);
    setIsLoading(false);
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  // If there's a running task, show stop view
  if (currentTask && currentTask.isRunning) {
    return <StopTimerView task={currentTask} onTaskStopped={loadCurrentTask} />;
  }

  // Otherwise show start form
  return <StartTimerForm />;
}

// View for stopping current task
function StopTimerView({ task, onTaskStopped }: { task: Task; onTaskStopped: () => void }) {
  const [elapsedTime, setElapsedTime] = useState(getElapsedTime(task.startTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(getElapsedTime(task.startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [task.startTime]);

  async function handleStopAndExport() {
    const stoppedTask = await stopCurrentTask();
    if (stoppedTask && stoppedTask.calendarName) {
      await exportToCalendar(stoppedTask);
    }
    onTaskStopped();
  }

  const hasCalendar = !!task.calendarName;

  return (
    <Detail
      markdown={`# ⏱️ ${formatDuration(elapsedTime)}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Task" text={task.name} />
          <Detail.Metadata.Label title="Calendar" text={task.calendarName || "No export"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Started" text={formatDateTime(task.startTime)} />
          {task.url && <Detail.Metadata.Link title="URL" target={task.url} text={task.url} />}
          {task.notes && <Detail.Metadata.Label title="Notes" text={task.notes} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={hasCalendar ? "Stop & Export to Calendar" : "Stop Timer"}
            icon={Icon.Stop}
            onAction={handleStopAndExport}
          />
        </ActionPanel>
      }
    />
  );
}

// Form for starting new task
function StartTimerForm() {
  const [taskName, setTaskName] = useState("");
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDataAsync() {
      const [calendarInfos, taskSuggestions] = await Promise.all([
        getCalendarsWithColors(),
        getRecentTaskSuggestions(),
      ]);

      if (!cancelled) {
        setCalendars(calendarInfos);
        setSuggestions(taskSuggestions);
        if (calendarInfos.length > 0) {
          setSelectedCalendarId(calendarInfos[0].id);
        } else {
          setSelectedCalendarId(NO_EXPORT_VALUE);
        }
        setIsLoading(false);
      }
    }

    loadDataAsync();

    return () => {
      cancelled = true;
    };
  }, []);

  const NO_EXPORT_VALUE = "__no_export__";

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

  // loadData is now inlined in the useEffect with cancellation support

  function handleTaskSelect(value: string) {
    setTaskName(value);
    // Auto-select calendar and fill notes/url from suggestion if available
    const suggestion = suggestions.find((s) => s.name === value);
    if (suggestion) {
      // Find calendar by id first, then by name for backwards compatibility
      const matchedCalendar = calendars.find(
        (c) => c.id === suggestion.calendarId || c.name === suggestion.calendarName,
      );
      if (matchedCalendar) {
        setSelectedCalendarId(matchedCalendar.id);
      } else if (!suggestion.calendarId && !suggestion.calendarName) {
        setSelectedCalendarId(NO_EXPORT_VALUE);
      }
      // Auto-fill notes and url from suggestion
      if (suggestion.notes) {
        setNotes(suggestion.notes);
      }
      if (suggestion.url) {
        setUrl(suggestion.url);
      }
    }
  }

  async function handleSubmit() {
    if (!taskName.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task name required",
        message: "Please enter a task name",
      });
      return;
    }

    // Validate URL format
    const trimmedUrl = url.trim();
    if (trimmedUrl && !isValidUrl(trimmedUrl)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please enter a valid URL (e.g., https://example.com)",
      });
      return;
    }

    // Stop and export any running task before starting new one
    const currentTask = await getCurrentTask();
    if (currentTask && currentTask.isRunning) {
      const stoppedTask = await stopCurrentTask();
      if (stoppedTask && stoppedTask.calendarName) {
        await exportToCalendar(stoppedTask);
      }
    }

    const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId);
    const calendarId = selectedCalendarId === NO_EXPORT_VALUE ? undefined : selectedCalendarId;
    const calendarName = selectedCalendar?.name;
    const accountName = selectedCalendar?.accountName;
    const newTask = await startTask(
      taskName.trim(),
      calendarId,
      calendarName,
      accountName,
      notes.trim() || undefined,
      url.trim() || undefined,
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Timer Started",
      message: `Started tracking "${newTask.name}"${calendarName ? ` → ${calendarName}` : ""}`,
    });
    await popToRoot();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="taskName"
        title="Task Name"
        placeholder="Enter or search task name..."
        value={taskName}
        onChange={setTaskName}
        autoFocus
      />
      {suggestions.length > 0 && (
        <Form.Dropdown
          id="recentTask"
          title="Recent Tasks"
          value=""
          onChange={handleTaskSelect}
          info="Select a recent task to auto-fill name and calendar"
        >
          <Form.Dropdown.Item key="empty" value="" title="-- Select from recent --" />
          {suggestions.map((suggestion) => (
            <Form.Dropdown.Item
              key={suggestion.name}
              value={suggestion.name}
              title={suggestion.name}
              keywords={[suggestion.name, suggestion.calendarName || ""]}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown id="calendarId" title="Calendar" value={selectedCalendarId} onChange={setSelectedCalendarId}>
        <Form.Dropdown.Item key={NO_EXPORT_VALUE} value={NO_EXPORT_VALUE} title="Don't export" />
        {Array.from(calendarsByAccount.entries()).map(([accountName, cals]) => (
          <Form.Dropdown.Section key={accountName} title={accountName}>
            {cals.map((cal) => (
              <Form.Dropdown.Item key={cal.id} value={cal.id} title={cal.name} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="url" title="URL" placeholder="https://example.com (optional)" value={url} onChange={setUrl} />
      <Form.TextArea id="notes" title="Notes" placeholder="Add notes... (optional)" value={notes} onChange={setNotes} />
    </Form>
  );
}
