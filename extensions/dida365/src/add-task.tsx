import { Action, ActionPanel, Form, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { createTask, describeApiError, listProjects } from "./api/dida365.js";
import { PriorityDropdown, ProjectDropdown } from "./components/form-fields.js";
import { SetupTokenView } from "./components/setup-token-view.js";
import { isMissingApiToken } from "./setup.js";
import type { Project, TaskPriority } from "./types.js";
import { reminderTrigger, toDidaDate } from "./utils/date.js";
import { didaTimeZone, nowInTimeZone } from "./utils/timezone.js";

type Values = {
  title: string;
  projectId?: string;
  duePreset: string;
  customDueDate?: string;
  dueTimePreset: string;
  customDueTime?: string;
  priority: string;
  reminder: string;
  content?: string;
  checklist?: string;
};

export default function Command() {
  const { pop } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(async (error) => {
        if (isMissingApiToken(error)) {
          setNeedsSetup(true);
          return;
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load projects",
          message: describeApiError(error),
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(values: Values) {
    const title = values.title.trim();

    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task title is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task...",
    });

    try {
      const timeZone = didaTimeZone();
      const dueDate = resolveDueDate(values.duePreset, values.customDueDate);
      const hasDueTime = values.dueTimePreset !== "none";
      applyDueTime(dueDate, values.dueTimePreset, values.customDueTime);

      if (values.duePreset === "custom" && !dueDate) {
        toast.style = Toast.Style.Failure;
        toast.title = "Invalid custom date";
        toast.message = "Use YYYY-MM-DD or MM-DD, for example 2026-05-24";
        return;
      }

      if (dueDate && values.dueTimePreset === "custom" && !parseTime(values.customDueTime)) {
        toast.style = Toast.Style.Failure;
        toast.title = "Invalid custom time";
        toast.message = "Use HH:mm, for example 09:30";
        return;
      }

      await createTask({
        title,
        projectId: values.projectId || undefined,
        content: values.content?.trim() || undefined,
        dueDate: toDidaDate(dueDate, timeZone),
        timeZone,
        isAllDay: Boolean(dueDate && !hasDueTime),
        priority: Number(values.priority) as TaskPriority,
        reminders: reminderTrigger(values.reminder),
        items: parseChecklist(values.checklist),
      });

      toast.style = Toast.Style.Success;
      toast.title = "Task created";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create task";
      toast.message = describeApiError(error);
    }
  }

  if (needsSetup) {
    return <SetupTokenView />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" shortcut={Keyboard.Shortcut.Common.Save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="例如：明天上午提交报告" />

      <ProjectDropdown projects={projects} />

      <Form.Dropdown id="duePreset" title="Due Date" defaultValue="none">
        <Form.Dropdown.Item value="none" title="No Date" />
        <Form.Dropdown.Item value="today" title="Today" />
        <Form.Dropdown.Item value="tomorrow" title="Tomorrow" />
        <Form.Dropdown.Item value="yesterday" title="Yesterday" />
        <Form.Dropdown.Item value="monday" title="Monday" />
        <Form.Dropdown.Item value="custom" title="Custom Date" />
      </Form.Dropdown>

      <Form.TextField id="customDueDate" title="Custom Date" placeholder="YYYY-MM-DD or MM-DD, e.g. 2026-05-24" />

      <Form.Dropdown id="dueTimePreset" title="Due Time" defaultValue="none">
        <Form.Dropdown.Item value="none" title="No Time" />
        <Form.Dropdown.Item value="morning" title="09:00" />
        <Form.Dropdown.Item value="noon" title="12:00" />
        <Form.Dropdown.Item value="evening" title="18:00" />
        <Form.Dropdown.Item value="night" title="21:00" />
        <Form.Dropdown.Item value="custom" title="Custom Time" />
      </Form.Dropdown>

      <Form.TextField id="customDueTime" title="Custom Time" placeholder="09:30" />

      <PriorityDropdown />

      <Form.Dropdown id="reminder" title="Reminder" defaultValue="none">
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="at_due" title="At due time" />
        <Form.Dropdown.Item value="5m" title="5 minutes before" />
        <Form.Dropdown.Item value="10m" title="10 minutes before" />
        <Form.Dropdown.Item value="30m" title="30 minutes before" />
        <Form.Dropdown.Item value="1h" title="1 hour before" />
        <Form.Dropdown.Item value="1d" title="1 day before" />
      </Form.Dropdown>

      <Form.TextArea id="content" title="Notes" placeholder="Optional notes" />
      <Form.TextArea id="checklist" title="Checklist" placeholder="One item per line" />
    </Form>
  );
}

function parseChecklist(value?: string) {
  const items = value
    ?.split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((title, index) => ({ title, sortOrder: index }));

  return items && items.length > 0 ? items : undefined;
}

function resolveDueDate(preset: string, customDate?: string): Date | undefined {
  const now = nowInTimeZone();

  switch (preset) {
    case "today":
      return startOfDay(now);
    case "tomorrow":
      return addDays(now, 1);
    case "yesterday":
      return addDays(now, -1);
    case "monday":
      return nextWeekday(now, 1);
    case "custom":
      return parseCustomDate(customDate);
    default:
      return undefined;
  }
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function nextWeekday(date: Date, weekday: number): Date {
  const day = date.getDay();
  const daysUntilWeekday = (weekday - day + 7) % 7 || 7;
  return addDays(date, daysUntilWeekday);
}

function applyDueTime(date: Date | undefined, preset: string, customTime?: string) {
  if (!date) {
    return;
  }

  const time = resolveTime(preset, customTime);

  if (!time) {
    return;
  }

  date.setHours(time.hour, time.minute, 0, 0);
}

function resolveTime(preset: string, customTime?: string) {
  switch (preset) {
    case "morning":
      return { hour: 9, minute: 0 };
    case "noon":
      return { hour: 12, minute: 0 };
    case "evening":
      return { hour: 18, minute: 0 };
    case "night":
      return { hour: 21, minute: 0 };
    case "custom":
      return parseTime(customTime);
    default:
      return undefined;
  }
}

function parseTime(value?: string): { hour: number; minute: number } | undefined {
  const text = value?.trim();

  if (!text) {
    return undefined;
  }

  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) {
    return undefined;
  }

  return { hour, minute };
}

function parseCustomDate(value?: string): Date | undefined {
  const text = value?.trim();

  if (!text) {
    return undefined;
  }

  const fullDate = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (fullDate) {
    return startOfDay(new Date(Number(fullDate[1]), Number(fullDate[2]) - 1, Number(fullDate[3])));
  }

  const shortDate = text.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (shortDate) {
    const now = nowInTimeZone();
    return startOfDay(new Date(now.getFullYear(), Number(shortDate[1]) - 1, Number(shortDate[2])));
  }

  return undefined;
}
