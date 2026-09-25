import { Tool } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { getEventType, listAvailableTimes } from "../api/event-types";
import { bookMeeting } from "../api/meetings";
import { isSameInstant } from "../lib/dates";
import { getBookingLocations, resolveBookingLocation } from "../lib/booking-location";
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
  /** Location kind from the selected event type. Omit for round-robin events. */
  locationKind?: string;
  /** Required for outbound_call: the invitee's phone number, never their email. For ask_invitee: their meeting location. Ask the user before calling if missing. Omit for round-robin events. */
  location?: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Book this Calendly meeting with ${input.inviteeName}?`,
  info: [
    { name: "Invitee", value: `${input.inviteeName} (${input.inviteeEmail})` },
    { name: "Start", value: new Date(input.startTime).toLocaleString() },
    { name: "Timezone", value: input.inviteeTimezone },
    ...(input.location ? [{ name: "Location", value: input.location }] : []),
  ],
});

async function tool(input: Input) {
  const eventType = await getEventType(input.eventTypeUri);
  const locations = getBookingLocations(eventType);
  const configuredLocation = input.locationKind
    ? locations.find((location) => location.kind === input.locationKind)
    : locations.length === 1
      ? locations[0]
      : undefined;
  const location = resolveBookingLocation({ eventType, selectedLocation: configuredLocation, details: input.location });
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

  return bookMeeting({
    eventTypeUri: eventType.uri,
    startTime: input.startTime,
    name: input.inviteeName,
    email: input.inviteeEmail,
    timezone: input.inviteeTimezone,
    location,
  });
}

export default withAccessToken(calendlyOAuth)(tool);
