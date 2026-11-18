import { open } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";
import { CalendarEvent, googleCalendarUrl, outlookCalendarUrl, validateEvent } from "./calendar";
import { writeIcsFile } from "./ics";

export type CalendarProvider = "google" | "outlook" | "ics";

export function isCalendarProvider(value: unknown): value is CalendarProvider {
  return value === "google" || value === "outlook" || value === "ics";
}

type ExportResult =
  | { status: "draft-opened"; provider: "google" | "outlook"; url: string; warnings: string[] }
  | { status: "invite-saved"; provider: "ics"; path: string; opened: boolean; warnings: string[] };

/** Opens a draft or saves an invite. The user still has to save or import the event. */
export async function exportCalendarEvent(provider: CalendarProvider, event: CalendarEvent): Promise<ExportResult> {
  const error = validateEvent(event);
  if (error) throw new Error(error);

  const warnings: string[] = [];
  if (provider === "outlook" && event.recurrence !== "none") {
    warnings.push("Outlook compose links cannot repeat events. Import the saved .ics file in Outlook.");
  }
  if (provider === "ics" || (provider === "outlook" && event.recurrence !== "none")) {
    const path = await writeIcsFile(event, join(homedir(), "Downloads"));
    let opened = true;
    try {
      await open(path);
    } catch {
      // The file was saved successfully. Report it instead of prompting a duplicate export on retry.
      opened = false;
      warnings.push("The invite was saved, but could not be opened. Open the saved file to import it.");
    }
    if (event.recurrence !== "none") {
      warnings.push("Recurring invites use floating local time. Import in your local calendar time zone.");
    }
    return { status: "invite-saved", provider: "ics", path, opened, warnings };
  }

  const url = provider === "google" ? googleCalendarUrl(event) : outlookCalendarUrl(event);
  await open(url);
  if (event.isPrivate) {
    warnings.push("This calendar link cannot set Private. Adjust visibility before saving the event.");
  }
  if (provider === "google" && event.recurrence !== "none") {
    warnings.push("Confirm the recurrence in Google Calendar before saving.");
  } else if (provider === "outlook") {
    warnings.push("Set Busy in Outlook before saving if needed.");
  }
  return { status: "draft-opened", provider, url, warnings };
}
