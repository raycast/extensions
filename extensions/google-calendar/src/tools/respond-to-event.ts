import { getPreferenceValues } from "@raycast/api";
import { getNotificationLevel, serializeEvent } from "../lib/events";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";
import { tool as getCurrentUser } from "./get-current-user";

type Input = {
  /** Google Calendar event ID, usually obtained from search-events or get-event. */
  eventId: string;
  /** Calendar containing the invitation. Defaults to "primary". */
  calendarId?: string;
  /** RSVP response. needsAction resets an existing response. */
  response: "accepted" | "declined" | "tentative" | "needsAction";
  /** Optional response comment visible to the organizer. Empty string clears a previous comment. */
  comment?: string;
  /** Notification level for the response. Defaults to the extension preference. */
  notificationLevel?: "all" | "externalOnly" | "none";
};

async function getSelfAttendee(input: Input) {
  const calendarId = input.calendarId ?? "primary";
  const event = await getCalendarClient().events.get({ calendarId, eventId: input.eventId });
  let attendee = event.data.attendees?.find((candidate) => candidate.self);
  if (!attendee) {
    const currentUser = await getCurrentUser();
    attendee = event.data.attendees?.find(
      (candidate) => candidate.email?.toLowerCase() === currentUser.email?.toLowerCase(),
    );
  }
  if (!attendee?.email) throw new Error("The current user is not an attendee of this event.");
  return { event: event.data, attendee };
}

export const confirmation = withGoogleAPIs(async (input: Input) => {
  const { event, attendee } = await getSelfAttendee(input);
  return {
    message: `Respond "${input.response}" to this invitation?`,
    info: [
      { name: "Event", value: event.summary ?? "Untitled Event" },
      { name: "Attendee", value: attendee.email },
      { name: "Current Response", value: attendee.responseStatus },
      { name: "New Response", value: input.response },
      { name: "Comment", value: input.comment },
    ],
  };
});

const tool = async (input: Input) => {
  const preferences = getPreferenceValues<Preferences>();
  const calendarId = input.calendarId ?? "primary";
  const { attendee } = await getSelfAttendee(input);
  const calendar = getCalendarClient();
  await calendar.events.patch({
    calendarId,
    eventId: input.eventId,
    sendUpdates: getNotificationLevel(input, preferences.sendInvitations),
    requestBody: {
      attendeesOmitted: true,
      attendees: [
        {
          email: attendee.email,
          responseStatus: input.response,
          ...(input.comment !== undefined ? { comment: input.comment } : {}),
        },
      ],
    },
  });
  const updated = await calendar.events.get({ calendarId, eventId: input.eventId });
  return serializeEvent(updated.data, calendarId);
};

export default withGoogleAPIs(tool);
