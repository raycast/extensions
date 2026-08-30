import { Tool } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { getEventType, listAvailableTimes } from "../api/event-types";
import { bookMeeting } from "../api/meetings";
import { isSameInstant } from "../lib/dates";
import { calendlyOAuth } from "../oauth/calendly";

interface Input {
  /** Event type URI returned by List Event Types. */
  eventTypeUri: string;
  /** Available start time returned by Find Available Times, in ISO 8601 format. */
  startTime: string;
  /** Invitee's full name. */
  inviteeName: string;
  /** Invitee's email address. */
  inviteeEmail: string;
  /** Invitee's IANA timezone, for example America/New_York. */
  inviteeTimezone: string;
  /** Location kind from the selected event type, if it defines locations. */
  locationKind?: string;
  /** Invitee-supplied location details when the selected kind requires them. */
  location?: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Book this Calendly meeting with ${input.inviteeName}?`,
  info: [
    { name: "Invitee", value: `${input.inviteeName} (${input.inviteeEmail})` },
    { name: "Start", value: new Date(input.startTime).toLocaleString() },
    { name: "Timezone", value: input.inviteeTimezone },
  ],
});

async function tool(input: Input) {
  const eventType = await getEventType(input.eventTypeUri);
  const startTime = new Date(input.startTime);
  if (!Number.isFinite(startTime.getTime())) throw new Error("startTime must be a valid ISO 8601 date.");
  if (startTime.getTime() <= Date.now() + 60_000) {
    throw new Error(
      "That start time is no longer far enough in the future. Find available times again before booking.",
    );
  }

  const verificationStart = new Date(startTime.getTime() - 60_000);
  const verificationEnd = new Date(startTime.getTime() + Math.max(eventType.duration, 1) * 60_000);
  const availableTimes = await listAvailableTimes(eventType.uri, verificationStart, verificationEnd);
  if (!availableTimes.some((time) => time.status === "available" && isSameInstant(time.start_time, input.startTime))) {
    throw new Error("That time is no longer available. Find available times again before booking.");
  }

  const configuredLocation = input.locationKind
    ? eventType.locations.find((location) => location.kind === input.locationKind)
    : eventType.locations.length === 1
      ? eventType.locations[0]
      : undefined;
  if (eventType.locations.length > 1 && !configuredLocation) {
    throw new Error("Choose a locationKind from the event type before booking.");
  }

  return bookMeeting({
    eventTypeUri: eventType.uri,
    startTime: input.startTime,
    name: input.inviteeName,
    email: input.inviteeEmail,
    timezone: input.inviteeTimezone,
    location: configuredLocation
      ? { ...configuredLocation, ...(input.location ? { location: input.location } : {}) }
      : undefined,
  });
}

export default withAccessToken(calendlyOAuth)(tool);
