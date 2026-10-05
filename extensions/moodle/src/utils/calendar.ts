import { runAppleScript } from "@raycast/utils";
import { showToast, Toast, open } from "@raycast/api";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export interface CalendarEventPayload {
  title: string;
  dueDate: number; // Unix timestamp in seconds
  description?: string;
  url?: string;
  calendarName?: string;
}

/**
 * Escapes characters for AppleScript string literals.
 */
function escapeAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Formats a Date into iCalendar (ICS) UTC timestamp string (e.g. 20260915T235900Z)
 */
function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Adds an assignment event directly to macOS Calendar with reminder alarm.
 */
export async function addAssignmentToCalendar(
  payload: CalendarEventPayload,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Adding to Calendar...",
  });

  const due = new Date(payload.dueDate * 1000);
  const start = new Date(due.getTime() - 60 * 60 * 1000); // 1 hour duration leading up to deadline

  const targetCal = payload.calendarName?.trim() || "";
  const title = escapeAppleScript(payload.title);
  const desc = escapeAppleScript(payload.description || "");
  const url = escapeAppleScript(payload.url || "");

  // Construct locale-independent AppleScript date setting
  const script = `
tell application "Calendar"
    set targetCal to missing value
    ${
      targetCal
        ? `try
        set targetCal to calendar "${escapeAppleScript(targetCal)}"
    end try`
        : ""
    }
    if targetCal is missing value then
        try
            set targetCal to default calendar
        on error
            try
                set targetCal to (first calendar whose writable is true)
            on error
                set targetCal to first calendar
            end try
        end try
    end if

    set startDate to (current date)
    set year of startDate to ${start.getFullYear()}
    set month of startDate to ${start.getMonth() + 1}
    set day of startDate to ${start.getDate()}
    set hours of startDate to ${start.getHours()}
    set minutes of startDate to ${start.getMinutes()}
    set seconds of startDate to ${start.getSeconds()}

    set endDate to (current date)
    set year of endDate to ${due.getFullYear()}
    set month of endDate to ${due.getMonth() + 1}
    set day of endDate to ${due.getDate()}
    set hours of endDate to ${due.getHours()}
    set minutes of endDate to ${due.getMinutes()}
    set seconds of endDate to ${due.getSeconds()}

    tell targetCal
        set newEvt to make new event with properties {summary:"${title}", start date:startDate, end date:endDate, description:"${desc}", url:"${url}"}
        tell newEvt
            make new display alarm at end of display alarms with properties {trigger interval:-86400} -- 24h reminder
        end tell
    end tell
    return "SUCCESS"
end tell
`;

  try {
    const result = await runAppleScript(script);
    if (result.includes("SUCCESS")) {
      toast.style = Toast.Style.Success;
      toast.title = "Added to Calendar";
      toast.message = `${payload.title} on ${due.toLocaleDateString()}`;
      return;
    }
  } catch {
    // If AppleScript was blocked by permission or failed, fallback gracefully to .ics file
    try {
      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Raycast//Moodle Extension//EN",
        "BEGIN:VEVENT",
        `UID:${Date.now()}@raycast-moodle`,
        `DTSTAMP:${toICSDate(new Date())}`,
        `DTSTART:${toICSDate(start)}`,
        `DTEND:${toICSDate(due)}`,
        `SUMMARY:${payload.title.replace(/\n/g, " ")}`,
        `DESCRIPTION:${(payload.description || "").replace(/\n/g, "\\n")}`,
        `URL:${payload.url || ""}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT24H",
        "ACTION:DISPLAY",
        "DESCRIPTION:Assignment Reminder",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const tempFilePath = path.join(
        os.tmpdir(),
        `moodle-deadline-${Date.now()}.ics`,
      );
      await fs.writeFile(tempFilePath, icsContent, "utf-8");
      await open(tempFilePath);

      toast.style = Toast.Style.Success;
      toast.title = "Opened in Calendar";
      toast.message = "Event prompt opened in macOS Calendar";
      return;
    } catch (fallbackError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Add to Calendar";
      toast.message =
        fallbackError instanceof Error
          ? fallbackError.message
          : "Unknown error";
    }
  }
}
