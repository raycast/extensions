import { Action } from "@raycast/api";
import { assertNonEmpty, assertTimeZone, requireCalendarOwner, serializeCalendar } from "../lib/calendar-resources";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /** Metadata operation. Get is read-only. Create always creates a new secondary calendar. */
  action: "get" | "create" | "update" | "delete";
  /** Calendar ID from list-calendars. Required for update/delete; defaults to "primary" for get. */
  calendarId?: string;
  /** Calendar title. Required for create. */
  summary?: string;
  /** Calendar description. Empty string clears it during update. */
  description?: string;
  /** Free-form geographic location. Empty string clears it during update. */
  location?: string;
  /** IANA time zone such as Europe/Zurich. */
  timeZone?: string;
};

function validate(input: Input) {
  if ((input.action === "update" || input.action === "delete") && !input.calendarId) {
    throw new Error(`calendarId is required to ${input.action} a calendar.`);
  }
  if (input.action === "create" && input.summary === undefined)
    throw new Error("summary is required to create a calendar.");
  if (input.summary !== undefined) assertNonEmpty(input.summary, "summary");
  assertTimeZone(input.timeZone);
  if (
    input.action === "update" &&
    input.summary === undefined &&
    input.description === undefined &&
    input.location === undefined &&
    input.timeZone === undefined
  ) {
    throw new Error("No calendar metadata changes were provided.");
  }
}

async function requireSecondaryOwner(calendarId: string) {
  const entry = await requireCalendarOwner(calendarId);
  if (entry.primary || calendarId === "primary") {
    throw new Error("The primary calendar cannot be deleted. This tool never clears a primary calendar.");
  }
  return entry;
}

export const confirmation = withGoogleAPIs(async (input: Input) => {
  if (input.action === "get") return undefined;
  validate(input);
  const calendar = getCalendarClient();
  let currentSummary: string | undefined;
  if (input.action === "update") {
    await requireCalendarOwner(input.calendarId!);
    currentSummary = (await calendar.calendars.get({ calendarId: input.calendarId! })).data.summary ?? undefined;
  } else if (input.action === "delete") {
    await requireSecondaryOwner(input.calendarId!);
    currentSummary = (await calendar.calendars.get({ calendarId: input.calendarId! })).data.summary ?? undefined;
  }
  return {
    style: input.action === "delete" ? Action.Style.Destructive : Action.Style.Regular,
    message:
      input.action === "delete"
        ? "Permanently delete this secondary calendar and all of its events?"
        : `${input.action === "create" ? "Create" : "Update"} this calendar?`,
    info: [
      { name: "Calendar", value: currentSummary ?? input.summary },
      { name: "Calendar ID", value: input.calendarId },
      { name: "New Summary", value: input.action === "update" ? input.summary : undefined },
      { name: "Description", value: input.description },
      { name: "Location", value: input.location },
      { name: "Time Zone", value: input.timeZone },
    ],
  };
});

const tool = async (input: Input) => {
  validate(input);
  const calendar = getCalendarClient();
  if (input.action === "get") {
    const response = await calendar.calendars.get({ calendarId: input.calendarId ?? "primary" });
    return serializeCalendar(response.data);
  }
  if (input.action === "create") {
    const response = await calendar.calendars.insert({
      requestBody: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        timeZone: input.timeZone,
      },
    });
    return serializeCalendar(response.data);
  }
  if (input.action === "delete") {
    await requireSecondaryOwner(input.calendarId!);
    await calendar.calendars.delete({ calendarId: input.calendarId! });
    return { deleted: true, calendarId: input.calendarId };
  }

  await requireCalendarOwner(input.calendarId!);
  const response = await calendar.calendars.patch({
    calendarId: input.calendarId!,
    requestBody: {
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
    },
  });
  return serializeCalendar(response.data);
};

export default withGoogleAPIs(tool);
