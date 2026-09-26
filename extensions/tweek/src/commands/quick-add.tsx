import {
  getPreferenceValues,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { resolveDefaultCalendar } from "../hooks/useCalendars";
import {
  getCachedCalendars,
  invalidateTaskCache,
  setCachedCalendars,
} from "../hooks/useTaskCache";
import { ExtensionPreferences } from "../types";
import {
  formatRelativeTaskDate,
  parseQuickAddInput,
} from "../utils/date-utils";
import { create_task, list_calendars } from "../utils/tweek-client";

interface QuickAddArguments {
  text: string;
  date?: string;
  note?: string;
}

export default async function QuickAddCommand(
  props: LaunchProps<{ arguments: QuickAddArguments }>,
) {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const { text, date, note } = props.arguments;

  if (!text || !text.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Task Title Required",
      message: "Please enter a task description.",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Adding task to Tweek...",
  });

  try {
    let calendars = getCachedCalendars(true);
    if (!calendars || calendars.length === 0) {
      calendars = await list_calendars();
      setCachedCalendars(calendars);
    }

    const targetCalendar = resolveDefaultCalendar(
      calendars,
      prefs.defaultCalendar,
    );
    if (!targetCalendar) {
      throw new Error("No Tweek calendars found on your account.");
    }

    const parsed = parseQuickAddInput(text, date);
    const listId =
      parsed.date === null && targetCalendar.lists?.[0]
        ? targetCalendar.lists[0].id
        : null;

    await create_task({
      calendarId: targetCalendar.id,
      text: parsed.cleanText,
      date: listId ? null : parsed.date,
      listId,
      color: parsed.color || prefs.defaultTaskColor || "blank",
      note: note?.trim() || undefined,
    });

    invalidateTaskCache(targetCalendar.id);

    const dateBadge = formatRelativeTaskDate(
      parsed.date,
      prefs.dateFormat || "dd/MM/yyyy",
    );

    toast.style = Toast.Style.Success;
    toast.title = "Task Added";
    toast.message = `${parsed.cleanText} (${targetCalendar.name} • ${dateBadge})`;
    await showHUD(`✅ Added "${parsed.cleanText}" to ${targetCalendar.name}`);
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Quick Add Failed";
    toast.message = err instanceof Error ? err.message : "Failed to add task.";
  }
}
