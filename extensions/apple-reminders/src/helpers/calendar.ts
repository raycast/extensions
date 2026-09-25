import { runAppleScript } from "@raycast/utils";

export type CalendarEventPayload = {
  calendarName?: string;
  title: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  notes?: string;
  location?: string;
  url?: string;
};

export const GET_CALENDARS_SCRIPT = `
tell application "Calendar"
  set calNames to name of every calendar
  set jsonList to {}
  repeat with aName in calNames
    set cleanName to (aName as text)
    set end of jsonList to "\\"" & cleanName & "\\""
  end repeat
  set AppleScript's text item delimiters to ","
  return "[" & (jsonList as text) & "]"
end tell
`;

export function parseCalendarListResult(rawResult: string | undefined): string[] {
  if (!rawResult) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawResult.trim());
    if (Array.isArray(parsed)) {
      return Array.from(new Set(parsed.map((item) => String(item).trim()).filter(Boolean)));
    }
    return [];
  } catch {
    return [];
  }
}

export async function getCalendarNames(): Promise<string[]> {
  try {
    const rawResult = await runAppleScript(GET_CALENDARS_SCRIPT);
    return parseCalendarListResult(rawResult);
  } catch {
    return [];
  }
}

export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildAppleScriptDate(d: Date, varName: string): string {
  return `set ${varName} to current date
set year of ${varName} to ${d.getFullYear()}
set month of ${varName} to ${d.getMonth() + 1}
set day of ${varName} to ${d.getDate()}
set hours of ${varName} to ${d.getHours()}
set minutes of ${varName} to ${d.getMinutes()}
set seconds of ${varName} to ${d.getSeconds()}`;
}

export function buildCreateCalendarEventScript(payload: CalendarEventPayload): string {
  const calTarget = payload.calendarName
    ? `first calendar whose name is "${escapeAppleScriptString(payload.calendarName)}"`
    : `first calendar`;

  const props: string[] = [
    `summary:"${escapeAppleScriptString(payload.title)}"`,
    `start date:startDate`,
    `end date:endDate`,
    `allday event:${payload.isAllDay ? "true" : "false"}`,
  ];

  if (payload.notes) {
    props.push(`description:"${escapeAppleScriptString(payload.notes)}"`);
  }
  if (payload.location) {
    props.push(`location:"${escapeAppleScriptString(payload.location)}"`);
  }
  if (payload.url) {
    props.push(`url:"${escapeAppleScriptString(payload.url)}"`);
  }

  return `tell application "Calendar"
  ${buildAppleScriptDate(payload.startDate, "startDate")}
  ${buildAppleScriptDate(payload.endDate, "endDate")}
  set cal to ${calTarget}
  make new event at end of events of cal with properties {${props.join(", ")}}
end tell`;
}

export async function createCalendarEvent(payload: CalendarEventPayload): Promise<void> {
  const script = buildCreateCalendarEventScript(payload);
  await runAppleScript(script);
}
