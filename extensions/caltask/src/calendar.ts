import { showToast, Toast, environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { Task, CalendarEvent, CalendarInfo } from "./types";
import { markTaskExported } from "./storage";
import { spawnSync } from "child_process";
import path from "path";

/**
 * Escape a string for safe use in AppleScript
 * Handles quotes, backslashes, and newlines to prevent injection
 */
function escapeAppleScriptString(str: string): string {
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\n/g, "\\n"); // Escape newlines
}

/**
 * Get the path to the Swift calendar helper script
 */
function getCalendarHelperScriptPath(): string {
  return path.join(environment.assetsPath, "CalendarHelper.swift");
}

/**
 * Fetch events from specified calendars within a date range
 * Uses Swift + EventKit for fast native calendar access
 * Runs the Swift script directly (no pre-compiled binary needed)
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
  const scriptPath = getCalendarHelperScriptPath();

  try {
    // Run Swift script directly - no compilation needed
    // Swift is available on all Macs with Xcode Command Line Tools
    const result = spawnSync(
      "swift",
      [scriptPath, startTimestamp.toString(), endTimestamp.toString(), ...calendarIds],
      {
        encoding: "utf-8",
        timeout: 30000, // 30 seconds timeout for script execution
      },
    );

    if (result.error) {
      // Check if Swift is not installed
      if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
        console.error("Swift not found. Please install Xcode Command Line Tools.");
        await showToast({
          style: Toast.Style.Failure,
          title: "Swift Not Found",
          message: "Please install Xcode Command Line Tools: xcode-select --install",
        });
      }
      throw result.error;
    }

    if (result.status !== 0) {
      console.error("Swift script error:", result.stderr);
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
 * Fetch all available calendar names from Mac Calendar app
 * @deprecated Use getCalendarsWithColors instead for color support
 */
export async function getCalendarNames(): Promise<string[]> {
  const calendars = await getCalendarsWithColors();
  return calendars.map((cal) => cal.name);
}

/**
 * Fetch all available calendars with their colors from Mac Calendar app
 * Uses Swift + EventKit for accurate color information
 */
export async function getCalendarsWithColors(): Promise<CalendarInfo[]> {
  const scriptPath = getCalendarHelperScriptPath();

  try {
    const result = spawnSync("swift", [scriptPath, "list"], {
      encoding: "utf-8",
      timeout: 30000,
    });

    if (result.error) {
      // Check if Swift is not installed
      if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
        console.error("Swift not found. Please install Xcode Command Line Tools.");
        await showToast({
          style: Toast.Style.Failure,
          title: "Swift Not Found",
          message: "Please install Xcode Command Line Tools: xcode-select --install",
        });
      }
      throw result.error;
    }

    if (result.status !== 0) {
      console.error("Swift script error:", result.stderr);
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
 * Export a completed task to Mac Calendar
 * Uses the calendar id stored in the task to find the current calendar name
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

  // If we have a calendarId, look up the current name (handles renames)
  let calendarName = task.calendarName || "";
  if (task.calendarId) {
    const calendars = await getCalendarsWithColors();
    const calendar = calendars.find((c) => c.id === task.calendarId);
    if (calendar) {
      calendarName = calendar.name;
    }
  }

  const startDate = new Date(task.startTime);
  const endDate = new Date(task.endTime);

  // Escape user inputs for safe use in AppleScript
  const escapedName = escapeAppleScriptString(task.name);
  const escapedCalendarName = escapeAppleScriptString(calendarName);
  const escapedNotes = escapeAppleScriptString(task.notes || "");
  const escapedUrl = escapeAppleScriptString(task.url || "");

  // Build event properties including optional notes and url
  const eventProperties = [`summary:"${escapedName}"`, "start date:startDate", "end date:endDate"];
  if (task.notes) {
    eventProperties.push(`description:"${escapedNotes}"`);
  }
  if (task.url) {
    eventProperties.push(`url:"${escapedUrl}"`);
  }

  // Build the AppleScript with date components set individually (locale-independent)
  const script = `
    set startDate to current date
    set hours of startDate to ${startDate.getHours()}
    set minutes of startDate to ${startDate.getMinutes()}
    set seconds of startDate to 0
    set day of startDate to ${startDate.getDate()}
    set month of startDate to ${startDate.getMonth() + 1}
    set year of startDate to ${startDate.getFullYear()}
    
    set endDate to current date
    set hours of endDate to ${endDate.getHours()}
    set minutes of endDate to ${endDate.getMinutes()}
    set seconds of endDate to 0
    set day of endDate to ${endDate.getDate()}
    set month of endDate to ${endDate.getMonth() + 1}
    set year of endDate to ${endDate.getFullYear()}
    
    tell application "Calendar"
      ${
        escapedCalendarName
          ? `set targetCalendar to calendar "${escapedCalendarName}"`
          : `set targetCalendar to first calendar`
      }
      make new event at end of events of targetCalendar with properties {${eventProperties.join(", ")}}
    end tell
    return "success"
  `;

  try {
    await runAppleScript(script);
    await markTaskExported(task.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Exported to Calendar",
      message: `"${task.name}" added to ${calendarName || "default calendar"}`,
    });
    return true;
  } catch {
    // Fallback: try with first calendar if specified calendar not found
    if (escapedCalendarName) {
      const fallbackScript = `
        set startDate to current date
        set hours of startDate to ${startDate.getHours()}
        set minutes of startDate to ${startDate.getMinutes()}
        set seconds of startDate to 0
        set day of startDate to ${startDate.getDate()}
        set month of startDate to ${startDate.getMonth() + 1}
        set year of startDate to ${startDate.getFullYear()}
        
        set endDate to current date
        set hours of endDate to ${endDate.getHours()}
        set minutes of endDate to ${endDate.getMinutes()}
        set seconds of endDate to 0
        set day of endDate to ${endDate.getDate()}
        set month of endDate to ${endDate.getMonth() + 1}
        set year of endDate to ${endDate.getFullYear()}
        
        tell application "Calendar"
          set targetCalendar to first calendar
          make new event at end of events of targetCalendar with properties {${eventProperties.join(", ")}}
        end tell
        return "success"
      `;

      try {
        await runAppleScript(fallbackScript);
        await markTaskExported(task.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Exported to Calendar",
          message: `"${task.name}" added (calendar "${calendarName}" not found, used default)`,
        });
        return true;
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Export Failed",
          message: "Could not add event to Calendar. Please check Calendar app permissions.",
        });
        return false;
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Export Failed",
      message: "Could not add event to Calendar. Please check Calendar app permissions.",
    });
    return false;
  }
}
