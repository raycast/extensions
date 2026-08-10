import { calendar_v3 } from "@googleapis/calendar";
import { normalizeHexColor, serializeCalendarListEntry, writableCalendarListEntry } from "../lib/calendar-resources";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /** Operation on the authenticated user's CalendarList. Get is read-only. */
  action: "get" | "insert" | "update" | "remove";
  /** Calendar ID. Insert adds this existing calendar to the user's list. */
  calendarId: string;
  /** User-specific display title. Empty string clears the override. */
  summaryOverride?: string;
  /** User-specific six-digit hexadecimal background color. */
  backgroundColor?: string;
  /** User-specific six-digit hexadecimal foreground color. */
  foregroundColor?: string;
  /** Hide or show this entry in the calendar list. */
  hidden?: boolean;
  /** Whether events from this calendar appear in the Calendar UI. */
  selected?: boolean;
  /**
   * Complete replacement reminders as comma-separated method:minutes pairs, e.g. "popup:10,email:60".
   * Empty string clears all defaults.
   */
  defaultReminders?: string;
  /**
   * Complete replacement email notification types, comma-separated. Allowed: eventCreation,
   * eventChange, eventCancellation, eventResponse, agenda. Empty string clears all.
   */
  notifications?: string;
};

const NOTIFICATION_TYPES = new Set(["eventCreation", "eventChange", "eventCancellation", "eventResponse", "agenda"]);

function parseReminders(value: string | undefined): calendar_v3.Schema$EventReminder[] | undefined {
  if (value === undefined) return undefined;
  if (!value.trim()) return [];
  return value.split(",").map((item) => {
    const [method, rawMinutes, ...extra] = item.trim().split(":");
    const minutes = Number(rawMinutes);
    if (
      extra.length ||
      (method !== "email" && method !== "popup") ||
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes > 40320
    ) {
      throw new Error(`Invalid reminder "${item}". Use email:minutes or popup:minutes with 0-40320.`);
    }
    return { method, minutes };
  });
}

function parseNotifications(value: string | undefined): calendar_v3.Schema$CalendarNotification[] | undefined {
  if (value === undefined) return undefined;
  if (!value.trim()) return [];
  return value.split(",").map((item) => {
    const type = item.trim();
    if (!NOTIFICATION_TYPES.has(type)) {
      throw new Error(`Invalid notification type "${type}".`);
    }
    return { type, method: "email" };
  });
}

function validate(input: Input) {
  if (!input.calendarId.trim()) throw new Error("calendarId cannot be empty.");
  if (input.backgroundColor !== undefined) normalizeHexColor(input.backgroundColor, "backgroundColor");
  if (input.foregroundColor !== undefined) normalizeHexColor(input.foregroundColor, "foregroundColor");
  parseReminders(input.defaultReminders);
  parseNotifications(input.notifications);
  if (
    input.action === "update" &&
    input.summaryOverride === undefined &&
    input.backgroundColor === undefined &&
    input.foregroundColor === undefined &&
    input.hidden === undefined &&
    input.selected === undefined &&
    input.defaultReminders === undefined &&
    input.notifications === undefined
  ) {
    throw new Error("No CalendarList changes were provided.");
  }
}

function requestedProperties(input: Input): calendar_v3.Schema$CalendarListEntry {
  return {
    ...(input.summaryOverride !== undefined ? { summaryOverride: input.summaryOverride } : {}),
    ...(input.backgroundColor !== undefined
      ? { backgroundColor: normalizeHexColor(input.backgroundColor, "backgroundColor") }
      : {}),
    ...(input.foregroundColor !== undefined
      ? { foregroundColor: normalizeHexColor(input.foregroundColor, "foregroundColor") }
      : {}),
    ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
    ...(input.selected !== undefined ? { selected: input.selected } : {}),
    ...(input.defaultReminders !== undefined ? { defaultReminders: parseReminders(input.defaultReminders) } : {}),
    ...(input.notifications !== undefined
      ? { notificationSettings: { notifications: parseNotifications(input.notifications) } }
      : {}),
  };
}

export const confirmation = withGoogleAPIs(async (input: Input) => {
  if (input.action === "get") return undefined;
  validate(input);
  const calendar = getCalendarClient();
  let name: string | undefined;
  if (input.action === "insert") {
    name = (await calendar.calendars.get({ calendarId: input.calendarId })).data.summary ?? undefined;
  } else {
    const current = await calendar.calendarList.get({ calendarId: input.calendarId });
    if (input.action === "remove" && current.data.primary) {
      throw new Error("The primary calendar cannot be removed from CalendarList.");
    }
    name = current.data.summaryOverride ?? current.data.summary ?? undefined;
  }
  return {
    message:
      input.action === "remove"
        ? "Remove this calendar from your calendar list? The calendar itself will not be deleted."
        : `${input.action === "insert" ? "Add" : "Update"} this calendar-list entry?`,
    info: [
      { name: "Calendar", value: name },
      { name: "Calendar ID", value: input.calendarId },
      { name: "Summary Override", value: input.summaryOverride },
      { name: "Background", value: input.backgroundColor },
      { name: "Foreground", value: input.foregroundColor },
      { name: "Hidden", value: input.hidden?.toString() },
      { name: "Selected", value: input.selected?.toString() },
      { name: "Default Reminders", value: input.defaultReminders },
      { name: "Notifications", value: input.notifications },
    ],
  };
});

const tool = async (input: Input) => {
  validate(input);
  const calendar = getCalendarClient();
  if (input.action === "get") {
    const response = await calendar.calendarList.get({ calendarId: input.calendarId });
    return serializeCalendarListEntry(response.data);
  }
  if (input.action === "remove") {
    const current = await calendar.calendarList.get({ calendarId: input.calendarId });
    if (current.data.primary) throw new Error("The primary calendar cannot be removed from CalendarList.");
    await calendar.calendarList.delete({ calendarId: input.calendarId });
    return { removed: true, calendarId: input.calendarId };
  }

  const usesRgb = input.backgroundColor !== undefined || input.foregroundColor !== undefined;
  if (input.action === "insert") {
    const response = await calendar.calendarList.insert({
      colorRgbFormat: usesRgb || undefined,
      requestBody: { id: input.calendarId, ...requestedProperties(input) },
    });
    return serializeCalendarListEntry(response.data);
  }

  const current = await calendar.calendarList.get({ calendarId: input.calendarId });
  const preserveRgb = usesRgb || Boolean(current.data.backgroundColor || current.data.foregroundColor);
  const requestBody = {
    ...writableCalendarListEntry(current.data),
    ...requestedProperties(input),
    id: input.calendarId,
  };
  const response = await calendar.calendarList.update(
    { calendarId: input.calendarId, colorRgbFormat: preserveRgb || undefined, requestBody },
    current.data.etag ? { headers: { "If-Match": current.data.etag } } : undefined,
  );
  return serializeCalendarListEntry(response.data);
};

export default withGoogleAPIs(tool);
