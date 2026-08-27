import { Tool } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { getEventType, listAvailableTimes } from "../api/event-types";
import { bookMeeting } from "../api/meetings";
import { isValidTimezone } from "../lib/dates";
import { locationTitle, locationWithInviteeDetails, resolveConfiguredLocation } from "../lib/locations";
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
  /** Zero-based location index from List Event Types. Required when the event type has more than one location. */
  locationIndex?: number;
  /** Invitee-supplied location details when the selected location requires them. */
  location?: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const eventType = await getEventType(input.eventTypeUri);
  const location = resolveConfiguredLocation(eventType.locations, input.locationIndex);
  return {
    message: `Book ${eventType.name} with ${input.inviteeName}?`,
    info: [
      { name: "Invitee", value: `${input.inviteeName} (${input.inviteeEmail})` },
      { name: "Start", value: new Date(input.startTime).toLocaleString() },
      { name: "Timezone", value: input.inviteeTimezone },
      { name: "Location", value: location ? locationTitle(location) : undefined },
    ],
  };
};

async function tool(input: Input) {
  if (!isValidTimezone(input.inviteeTimezone)) {
    throw new Error("inviteeTimezone must be a valid IANA timezone, for example America/New_York.");
  }
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
  if (!availableTimes.some((time) => time.status === "available" && time.start_time === input.startTime)) {
    throw new Error("That time is no longer available. Find available times again before booking.");
  }

  const configuredLocation = resolveConfiguredLocation(eventType.locations, input.locationIndex);

  return bookMeeting({
    eventTypeUri: eventType.uri,
    startTime: input.startTime,
    name: input.inviteeName,
    email: input.inviteeEmail,
    timezone: input.inviteeTimezone,
    location: configuredLocation ? locationWithInviteeDetails(configuredLocation, input.location) : undefined,
  });
}

export default withAccessToken(calendlyOAuth)(tool);
