import { calendar_v3 } from "@googleapis/calendar";
import { getPreferenceValues } from "@raycast/api";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";
import {
  EventLabelVersionParams,
  getCalendarWithLabels,
  getEventLabels,
  requireLabel,
} from "../lib/calendar-resources";
import {
  buildEventResource,
  describeEventInput,
  getNotificationLevel,
  hasAttachmentChanges,
  hasConferenceChanges,
  serializeEvent,
} from "../lib/events";

type Input = {
  /** Google Calendar event ID, usually obtained from search-events or get-event. */
  eventId: string;
  /** Calendar containing the event. Defaults to "primary". */
  calendarId?: string;
  /** New title. An empty string clears it. */
  title?: string;
  /** New description. An empty string intentionally clears it. */
  description?: string;
  /** New location. An empty string intentionally clears it. */
  location?: string;
  /** New RFC3339 datetime with Z/numeric offset, or YYYY-MM-DD for an all-day event. */
  startDate?: string;
  /** New explicit exclusive end datetime/date. */
  endDate?: string;
  /** New timed duration in minutes. Moves preserve the existing duration when omitted. */
  duration?: number;
  /** New all-day duration in whole days. */
  durationDays?: number;
  /** Change between timed and all-day. startDate is required when changing this value. */
  allDay?: boolean;
  /** IANA time zone. An empty string clears the custom time zone. */
  timeZone?: string;
  /** Comma-separated required guest emails to add. An empty string clears required guests. */
  requiredAttendees?: string;
  /** Backwards-compatible alias for requiredAttendees. */
  attendees?: string;
  /** Comma-separated optional guest emails to add. An empty string clears optional guests. */
  optionalAttendees?: string;
  /** Comma-separated room/resource calendar emails to add. An empty string clears resources. */
  resourceAttendees?: string;
  /**
   * Replacement RFC5545 recurrence rules, one per line. Empty string removes recurrence.
   * To edit one occurrence, use that occurrence's event ID and do not set recurrence.
   */
  recurrence?: string;
  /** New visibility. */
  visibility?: "default" | "public" | "private" | "confidential";
  /** New availability: opaque is busy, transparent is free. */
  transparency?: "opaque" | "transparent";
  /** New event status. Setting cancelled cancels the event. */
  status?: "confirmed" | "tentative" | "cancelled";
  /** New event color. Empty string restores the calendar default. */
  color?: string;
  /** Custom label ID from manage-calendar-labels. Empty removes it. Supersedes legacy color. */
  eventLabelId?: string;
  /** Use calendar defaults. Cannot be combined with custom reminders. */
  useDefaultReminders?: boolean;
  /** Replacement comma-separated popup offsets in minutes. Empty clears popup reminders. */
  popupReminderMinutes?: string;
  /** Replacement comma-separated email offsets in minutes. Empty clears email reminders. */
  emailReminderMinutes?: string;
  /** Whether guests can invite others. */
  guestsCanInviteOthers?: boolean;
  /** Whether guests can modify this event. */
  guestsCanModify?: boolean;
  /** Whether guests can see other guests. */
  guestsCanSeeOtherGuests?: boolean;
  /** Replacement attachment URLs. Empty string removes all attachments. */
  attachmentUrls?: string;
  /** Existing immutable event type. Supplying a different type is rejected. */
  eventType?: "default" | "birthday" | "focusTime" | "outOfOffice" | "workingLocation";
  /** Focus-time invitation handling. Only applies to focusTime events. */
  focusTimeAutoDeclineMode?:
    | "declineNone"
    | "declineAllConflictingInvitations"
    | "declineOnlyNewConflictingInvitations";
  /** Focus-time Chat status. */
  focusTimeChatStatus?: "available" | "doNotDisturb";
  /** Focus-time auto-decline message. Empty clears it. */
  focusTimeDeclineMessage?: string;
  /** Out-of-office invitation handling. */
  outOfOfficeAutoDeclineMode?:
    | "declineNone"
    | "declineAllConflictingInvitations"
    | "declineOnlyNewConflictingInvitations";
  /** Out-of-office auto-decline message. Empty clears it. */
  outOfOfficeDeclineMessage?: string;
  /** Working-location kind. */
  workingLocationType?: "homeOffice" | "officeLocation" | "customLocation";
  /** Working-location label. Empty clears it. */
  workingLocationLabel?: string;
  /** Office building identifier. Empty clears it. */
  workingLocationBuildingId?: string;
  /** Office floor identifier. Empty clears it. */
  workingLocationFloorId?: string;
  /** Office floor-section identifier. Empty clears it. */
  workingLocationFloorSectionId?: string;
  /** Office desk identifier. Empty clears it. */
  workingLocationDeskId?: string;
  /** Keep, add, or remove Google Meet. Omit to preserve conferencing exactly. */
  googleMeetAction?: "keep" | "add" | "remove";
  /** Guest notification level. Defaults to the extension preference. */
  notificationLevel?: "all" | "externalOnly" | "none";
};

export const confirmation = withGoogleAPIs(async (input: Input) => {
  const calendarId = input.calendarId ?? "primary";
  const current = await getCalendarClient().events.get({ calendarId, eventId: input.eventId });
  const info = [
    { name: "Event", value: current.data.summary ?? "Untitled Event" },
    ...describeEventInput({ ...input, conferenceAction: input.googleMeetAction }),
  ];
  return { message: "Apply these changes to the Google Calendar event?", info };
});

const tool = async (input: Input) => {
  const preferences = getPreferenceValues<Preferences>();
  const calendar = getCalendarClient();
  const calendarId = input.calendarId ?? "primary";
  const existing = await calendar.events.get({ calendarId, eventId: input.eventId });
  const labels = input.eventLabelId !== undefined ? getEventLabels(await getCalendarWithLabels(calendarId)) : undefined;
  if (input.eventLabelId) requireLabel(labels ?? [], input.eventLabelId);
  const writeInput = { ...input, conferenceAction: input.googleMeetAction };
  const requestBody = buildEventResource(writeInput, {
    existing: existing.data,
    addSignature: Boolean(preferences.addSignature),
  });
  if (Object.keys(requestBody).length === 0) throw new Error("No event changes were provided.");

  const requestParams: calendar_v3.Params$Resource$Events$Patch & Partial<EventLabelVersionParams> = {
    calendarId,
    eventId: input.eventId,
    requestBody,
    conferenceDataVersion: hasConferenceChanges(writeInput) ? 1 : undefined,
    supportsAttachments: hasAttachmentChanges(writeInput) ? true : undefined,
    sendUpdates: getNotificationLevel(input, preferences.sendInvitations),
    eventLabelVersion: input.eventLabelId !== undefined ? 1 : undefined,
  };
  const response = await calendar.events.patch(requestParams);
  return serializeEvent(response.data, calendarId, labels);
};

export default withGoogleAPIs(tool);
