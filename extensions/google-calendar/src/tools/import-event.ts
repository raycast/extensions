import { calendar_v3 } from "@googleapis/calendar";
import { getPreferenceValues, Tool } from "@raycast/api";
import {
  EventLabelVersionParams,
  EventWithLabel,
  getCalendarWithLabels,
  getEventLabels,
  requireLabel,
} from "../lib/calendar-resources";
import {
  applyImportedEventLabel,
  buildEventResource,
  describeEventInput,
  hasAttachmentChanges,
  serializeEvent,
} from "../lib/events";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /** RFC5545 iCalendar UID of the source event. Required for imports. */
  iCalUID: string;
  /** Event title. */
  title: string;
  /** RFC3339 start datetime or YYYY-MM-DD for an all-day event. */
  startDate: string;
  /** Explicit exclusive end datetime/date. */
  endDate?: string;
  /** Timed duration in minutes when endDate is omitted. */
  duration?: number;
  /** All-day duration in days when endDate is omitted. */
  durationDays?: number;
  /** Whether this is an all-day event. */
  allDay?: boolean;
  /** IANA timezone. Required for timed recurrence. */
  timeZone?: string;
  /** Description. */
  description?: string;
  /** Location. */
  location?: string;
  /** RFC5545 recurrence rules, one per line. */
  recurrence?: string;
  /** Visibility of the imported private copy. */
  visibility?: "default" | "public" | "private" | "confidential";
  /** Whether the imported event blocks time. */
  transparency?: "opaque" | "transparent";
  /** Legacy event color. Cannot be combined with eventLabelId. */
  color?: string;
  /** Calendar-specific custom label ID. */
  eventLabelId?: string;
  /** Comma- or newline-separated attachment URLs. */
  attachmentUrls?: string;
  /** Destination calendar. Defaults to "primary". */
  calendarId?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Import a private copy of this external event?",
  info: [
    { name: "iCalendar UID", value: input.iCalUID },
    { name: "Calendar", value: input.calendarId ?? "primary" },
    ...describeEventInput(input),
  ],
});

const tool = async (input: Input) => {
  if (!input.iCalUID.trim()) throw new Error("iCalUID cannot be empty.");
  const preferences = getPreferenceValues<Preferences>();
  const calendarId = input.calendarId ?? "primary";
  const labels = input.eventLabelId !== undefined ? getEventLabels(await getCalendarWithLabels(calendarId)) : undefined;
  if (input.eventLabelId) requireLabel(labels ?? [], input.eventLabelId);

  const eventLabelId = input.eventLabelId;
  const requestBody = buildEventResource(eventLabelId !== undefined ? { ...input, eventLabelId: undefined } : input, {
    isCreate: true,
    defaultDurationMinutes: Number(preferences.defaultEventDuration ?? 30),
    addSignature: Boolean(preferences.addSignature),
  }) as EventWithLabel;
  requestBody.iCalUID = input.iCalUID;
  requestBody.eventType = "default";

  const params: calendar_v3.Params$Resource$Events$Import = {
    calendarId,
    requestBody,
    supportsAttachments: hasAttachmentChanges(input) ? true : undefined,
  };
  const calendar = getCalendarClient();
  const imported = await calendar.events.import(params);
  let event = imported.data as EventWithLabel;
  if (eventLabelId !== undefined) {
    const labelBody: EventWithLabel = { eventLabelId };
    const patchParams: calendar_v3.Params$Resource$Events$Patch & EventLabelVersionParams = {
      calendarId,
      eventId: event.id!,
      requestBody: labelBody,
      eventLabelVersion: 1,
    };
    event = await applyImportedEventLabel(
      async () => (await calendar.events.patch(patchParams)).data as EventWithLabel,
      async () => {
        await calendar.events.delete({ calendarId, eventId: event.id! });
      },
    );
  }
  return serializeEvent(event, calendarId, labels);
};

export default withGoogleAPIs(tool);
