import { calendar_v3 } from "@googleapis/calendar";
import {
  EventLabelVersionParams,
  EventWithLabel,
  getCalendarWithLabels,
  getEventLabels,
  requireLabel,
} from "../lib/calendar-resources";
import { serializeEvent } from "../lib/events";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /** Assign a custom calendar label or remove the current label. */
  action: "assign" | "remove";
  /** Event ID from search-events or get-event. */
  eventId: string;
  /** Calendar containing the event. Defaults to "primary". */
  calendarId?: string;
  /** Label ID from manage-calendar-labels. Required when assigning. */
  labelId?: string;
};

async function context(input: Input) {
  if (input.action === "assign" && !input.labelId) throw new Error("labelId is required when assigning a label.");
  const calendarId = input.calendarId ?? "primary";
  const calendar = getCalendarClient();
  const [entry, event, metadata] = await Promise.all([
    calendar.calendarList.get({ calendarId }),
    calendar.events.get({ calendarId, eventId: input.eventId }),
    getCalendarWithLabels(calendarId),
  ]);
  if (!["writerWithoutPrivateAccess", "writer", "owner"].includes(entry.data.accessRole ?? "")) {
    throw new Error("At least writerWithoutPrivateAccess access is required to assign event labels.");
  }
  const label = input.action === "assign" ? requireLabel(getEventLabels(metadata), input.labelId!) : undefined;
  return { calendarId, event: event.data, label };
}

export const confirmation = withGoogleAPIs(async (input: Input) => {
  const { event, label } = await context(input);
  return {
    message:
      input.action === "assign" ? "Assign this custom label to the event?" : "Remove the custom label from the event?",
    info: [
      { name: "Event", value: event.summary ?? "Untitled Event" },
      { name: "Label", value: label?.name ?? (input.action === "remove" ? "(remove)" : undefined) },
      { name: "Label ID", value: label?.id ?? undefined },
      { name: "Color", value: label?.backgroundColor ?? undefined },
    ],
  };
});

const tool = async (input: Input) => {
  const { calendarId, label } = await context(input);
  const requestBody: EventWithLabel = { eventLabelId: input.action === "assign" ? label?.id : "" };
  const params: calendar_v3.Params$Resource$Events$Patch & EventLabelVersionParams = {
    calendarId,
    eventId: input.eventId,
    requestBody,
    eventLabelVersion: 1,
  };
  const response = await getCalendarClient().events.patch(params);
  return serializeEvent(response.data, calendarId, getEventLabels(await getCalendarWithLabels(calendarId)));
};

export default withGoogleAPIs(tool);
