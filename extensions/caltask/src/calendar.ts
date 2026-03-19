import { showToast, Toast, environment } from "@raycast/api";
import { Task, CalendarEvent, CalendarInfo, EventFormData, RecurringEventSpan } from "./types";
import { markTaskExported } from "./storage";
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

/** Marker added to event notes to identify caltask-created/updated events */
export const CALTASK_NOTES_MARKER = "[CalTask]";

/**
 * Ensure the CalendarHelper binary is compiled and up-to-date.
 * Returns true if binary is ready, false if compilation failed.
 */
function ensureCompiled(sourcePath: string, binaryPath: string): boolean {
  let needsCompile = false;

  try {
    const binaryStat = fs.statSync(binaryPath);
    const sourceStat = fs.statSync(sourcePath);
    // Recompile if source is newer (dev mode)
    needsCompile = sourceStat.mtimeMs > binaryStat.mtimeMs;
  } catch {
    // Binary doesn't exist yet
    needsCompile = true;
  }

  if (!needsCompile) return true;

  fs.mkdirSync(environment.supportPath, { recursive: true });

  const result = spawnSync("swiftc", [sourcePath, "-o", binaryPath], {
    encoding: "utf-8",
    timeout: 30000,
  });

  if (result.error || result.status !== 0) {
    console.error("Failed to compile CalendarHelper:", result.stderr || result.error);
    return false;
  }

  return true;
}

/**
 * Run the CalendarHelper with the given arguments.
 * Uses compiled binary for speed (~6x faster), falls back to
 * Swift interpreter if compilation fails.
 */
function runCalendarHelper(
  args: string[],
  timeout = 30000,
): { stdout: string; stderr: string; status: number | null; error: Error | undefined } {
  const sourcePath = path.join(environment.assetsPath, "CalendarHelper.swift");
  const binaryPath = path.join(environment.supportPath, "CalendarHelper");

  const compiled = ensureCompiled(sourcePath, binaryPath);

  const result = compiled
    ? spawnSync(binaryPath, args, { encoding: "utf-8", timeout })
    : spawnSync("swift", [sourcePath, ...args], { encoding: "utf-8", timeout });

  return {
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
    status: result.status,
    error: result.error,
  };
}

/**
 * Fetch events from specified calendars within a date range.
 * Uses compiled Swift binary + EventKit for fast native calendar access.
 */
export async function getCalendarEvents(
  calendarIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<CalendarEvent[]> {
  if (calendarIds.length === 0) {
    return [];
  }

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  try {
    const result = runCalendarHelper([startTimestamp.toString(), endTimestamp.toString(), ...calendarIds]);

    if (result.error) {
      console.error("CalendarHelper error:", result.error);
      throw result.error;
    }

    if (result.status !== 0) {
      console.error("CalendarHelper error:", result.stderr);
      // Check for calendar permission error
      if (result.stderr && result.stderr.includes("Calendar")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Calendar Access Denied",
          message: "Please grant Calendar access in System Preferences",
        });
      }
      return [];
    }

    const output = result.stdout;
    if (!output || !output.trim()) {
      return [];
    }

    // Swift already sorts events by start date, no need to sort again
    const events = JSON.parse(output) as CalendarEvent[];
    return events;
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return [];
  }
}

/**
 * Update an existing calendar event's start/end time and notes.
 * Uses CalendarHelper.swift's update mode.
 */
export async function updateCalendarEvent(
  eventId: string,
  startDate: Date,
  endDate: Date,
  notes?: string,
): Promise<boolean> {
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  const args = ["update", eventId, startTimestamp.toString(), endTimestamp.toString()];
  if (notes !== undefined) {
    args.push(notes);
  }

  try {
    const result = runCalendarHelper(args);

    if (result.error) {
      console.error("Failed to update calendar event:", result.error);
      return false;
    }

    if (result.status !== 0) {
      console.error("CalendarHelper update error:", result.stderr);
      return false;
    }

    return result.stdout.trim() === "ok";
  } catch (error) {
    console.error("Failed to update calendar event:", error);
    return false;
  }
}

/**
 * Create a new calendar event via EventKit.
 * Returns the event ID on success, null on failure.
 */
export async function createCalendarEvent(data: EventFormData): Promise<string | null> {
  const payload = {
    title: data.title,
    calendarId: data.calendarId,
    startTs: Math.floor(data.startDate.getTime() / 1000),
    endTs: Math.floor(data.endDate.getTime() / 1000),
    isAllDay: data.isAllDay,
    notes: data.notes || undefined,
    url: data.url || undefined,
    location: data.location || undefined,
    recurrenceRule: data.recurrenceRule,
    recurrenceEndTs: data.recurrenceEndDate ? Math.floor(data.recurrenceEndDate.getTime() / 1000) : undefined,
    alarmOffsets: data.alarmOffset ? [data.alarmOffset] : undefined,
  };

  try {
    const result = runCalendarHelper(["create", JSON.stringify(payload)]);

    if (result.error || result.status !== 0) {
      console.error("Failed to create event:", result.stderr || result.error);
      return null;
    }

    const parsed = JSON.parse(result.stdout.trim());
    return parsed.eventId || null;
  } catch (error) {
    console.error("Failed to create calendar event:", error);
    return null;
  }
}

/**
 * Delete a calendar event.
 * For recurring events, span controls what gets deleted.
 * Pass occurrenceDate to target a specific recurring occurrence.
 */
export async function deleteCalendarEvent(
  eventId: string,
  span: RecurringEventSpan = "this",
  occurrenceDate?: number,
): Promise<boolean> {
  try {
    const deleteArgs = ["delete", eventId, span];
    if (occurrenceDate != null) {
      deleteArgs.push(occurrenceDate.toString());
    }
    const result = runCalendarHelper(deleteArgs);

    if (result.error || result.status !== 0) {
      console.error("Failed to delete event:", result.stderr || result.error);
      return false;
    }

    return result.stdout.trim() === "ok";
  } catch (error) {
    console.error("Failed to delete calendar event:", error);
    return false;
  }
}

/**
 * Full update of a calendar event (all fields).
 * For recurring events, span controls the update scope.
 * Pass occurrenceDate to target a specific recurring occurrence.
 */
export async function updateCalendarEventFull(
  eventId: string,
  data: EventFormData,
  span: RecurringEventSpan = "this",
  occurrenceDate?: number,
): Promise<boolean> {
  const payload = {
    title: data.title,
    calendarId: data.calendarId,
    startTs: Math.floor(data.startDate.getTime() / 1000),
    endTs: Math.floor(data.endDate.getTime() / 1000),
    isAllDay: data.isAllDay,
    notes: data.notes || undefined,
    url: data.url || undefined,
    location: data.location || undefined,
    recurrenceRule: data.recurrenceRule,
    recurrenceEndTs: data.recurrenceEndDate ? Math.floor(data.recurrenceEndDate.getTime() / 1000) : undefined,
    alarmOffsets: data.alarmOffset ? [data.alarmOffset] : undefined,
  };

  const updateArgs = ["update-full", eventId, JSON.stringify(payload), span === "this" ? "this" : "all"];
  if (occurrenceDate != null) {
    updateArgs.push(occurrenceDate.toString());
  }

  try {
    const result = runCalendarHelper(updateArgs);

    if (result.error || result.status !== 0) {
      console.error("Failed to update event:", result.stderr || result.error);
      return false;
    }

    return result.stdout.trim() === "ok";
  } catch (error) {
    console.error("Failed to update calendar event:", error);
    return false;
  }
}

/**
 * Search calendar events by title across a time range.
 */
export async function searchCalendarEvents(
  query: string,
  startDate: Date,
  endDate: Date,
  calendarIds?: string[],
): Promise<CalendarEvent[]> {
  const startTs = Math.floor(startDate.getTime() / 1000);
  const endTs = Math.floor(endDate.getTime() / 1000);

  const searchArgs = ["search", query, startTs.toString(), endTs.toString()];
  if (calendarIds && calendarIds.length > 0) {
    searchArgs.push(...calendarIds);
  }

  try {
    const result = runCalendarHelper(searchArgs);

    if (result.error || result.status !== 0) {
      console.error("Search failed:", result.stderr || result.error);
      return [];
    }

    const output = result.stdout;
    if (!output || !output.trim()) return [];

    return JSON.parse(output) as CalendarEvent[];
  } catch (error) {
    console.error("Failed to search calendar events:", error);
    return [];
  }
}

/**
 * Fetch all available calendars with their colors from Mac Calendar app
 * Uses Swift + EventKit for accurate color information
 */
export async function getCalendarsWithColors(): Promise<CalendarInfo[]> {
  try {
    const result = runCalendarHelper(["list"]);

    if (result.error) {
      console.error("CalendarHelper error:", result.error);
      throw result.error;
    }

    if (result.status !== 0) {
      console.error("CalendarHelper error:", result.stderr);
      // Check for calendar permission error
      if (result.stderr && result.stderr.includes("Calendar")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Calendar Access Denied",
          message: "Please grant Calendar access in System Preferences",
        });
      }
      return [];
    }

    const output = result.stdout;
    if (!output || !output.trim()) {
      return [];
    }

    const calendars = JSON.parse(output) as CalendarInfo[];
    return calendars;
  } catch (error) {
    console.error("Failed to fetch calendars:", error);
    return [];
  }
}

/**
 * Export a completed task to Mac Calendar.
 * Uses EventKit via createCalendarEvent for native calendar access.
 */
export async function exportToCalendar(task: Task): Promise<boolean> {
  if (!task.endTime || !task.duration) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot export",
      message: "Task must be completed first",
    });
    return false;
  }

  const calendarId = task.calendarId;
  if (!calendarId) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot export",
      message: "No calendar selected",
    });
    return false;
  }

  const cleanNotes = (task.notes ?? "").replace(/^\[CalTask\]\s*/, "").trim();
  const notesWithMarker = cleanNotes ? `${CALTASK_NOTES_MARKER} ${cleanNotes}` : CALTASK_NOTES_MARKER;

  const eventId = await createCalendarEvent({
    title: task.name,
    calendarId,
    startDate: new Date(task.startTime),
    endDate: new Date(task.endTime),
    isAllDay: false,
    notes: notesWithMarker,
    url: task.url,
    recurrenceRule: "none",
  });

  if (eventId) {
    await markTaskExported(task.id);
    const calendarName = task.calendarName || "calendar";
    await showToast({
      style: Toast.Style.Success,
      title: "Exported to Calendar",
      message: `"${task.name}" added to ${calendarName}`,
    });
    return true;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Export Failed",
    message: "Could not create calendar event.",
  });
  return false;
}

/**
 * Export or update a calendar event based on how the task was started.
 * - If task has sourceCalendarEventId: UPDATE the original event
 * - Otherwise: CREATE a new event (existing behavior)
 */
export async function exportOrUpdateCalendarEvent(task: Task): Promise<boolean> {
  if (!task.endTime || !task.duration) {
    console.error("exportOrUpdateCalendarEvent: missing endTime or duration");
    return false;
  }

  if (task.sourceCalendarEventId) {
    // Build notes with CalTask marker
    // Strip existing [CalTask] prefix to prevent accumulation on re-track cycles
    const cleanNotes = (task.notes ?? "").replace(/^\[CalTask\]\s*/, "").trim();
    const notes = cleanNotes ? `${CALTASK_NOTES_MARKER} ${cleanNotes}` : CALTASK_NOTES_MARKER;

    const success = await updateCalendarEvent(
      task.sourceCalendarEventId,
      new Date(task.startTime),
      new Date(task.endTime),
      notes,
    );

    if (success) {
      await markTaskExported(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Calendar Event Updated",
        message: `"${task.name}" updated on calendar`,
      });
      return true;
    }

    // Fall back to creating a new event if update fails
    console.error("Failed to update calendar event, falling back to create");
  }

  return await exportToCalendar(task);
}
