import { calendar_v3 } from "@googleapis/calendar";
import { getPreferenceValues, Tool } from "@raycast/api";
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
  /** Event title. */
  title: string;
  /**
   * Start as RFC3339 datetime for timed events or YYYY-MM-DD for all-day events.
   * Always include Z or a numeric UTC offset for timed events.
   */
  startDate: string;
  /** Explicit exclusive end datetime/date. Prefer this when the user gave an end time. */
  endDate?: string;
  /** Timed-event length in minutes, used only when endDate is omitted. */
  duration?: number;
  /** All-day-event length in whole days, used only when endDate is omitted. */
  durationDays?: number;
  /** Set true for an all-day event. */
  allDay?: boolean;
  /** IANA time zone, such as "America/Los_Angeles". Required for timed recurring events. */
  timeZone?: string;
  /** Event description or agenda. */
  description?: string;
  /** Physical or virtual location text. */
  location?: string;
  /** Comma-separated required guest emails. `attendees` is a backwards-compatible alias. */
  requiredAttendees?: string;
  /** Backwards-compatible comma-separated required guest emails. */
  attendees?: string;
  /** Comma-separated optional guest emails. */
  optionalAttendees?: string;
  /** Comma-separated room/resource calendar emails. */
  resourceAttendees?: string;
  /**
   * RFC5545 recurrence rules, one per line, e.g. "RRULE:FREQ=WEEKLY;BYDAY=MO,WE".
   * Do not include DTSTART or DTEND.
   */
  recurrence?: string;
  /** Event visibility. */
  visibility?: "default" | "public" | "private" | "confidential";
  /** Whether the event blocks availability: opaque is busy, transparent is free. */
  transparency?: "opaque" | "transparent";
  /** Initial event status. */
  status?: "confirmed" | "tentative";
  /** Google event color name, colorId 1-11, or hex color. */
  color?: string;
  /** Custom label ID from manage-calendar-labels. Supersedes color; omit both to use the calendar default. */
  eventLabelId?: string;
  /** Use the calendar's default reminders. Cannot be combined with custom reminders. */
  useDefaultReminders?: boolean;
  /** Comma-separated popup reminder offsets in minutes, 0-40320. */
  popupReminderMinutes?: string;
  /** Comma-separated email reminder offsets in minutes, 0-40320. */
  emailReminderMinutes?: string;
  /** Whether guests can invite other guests. */
  guestsCanInviteOthers?: boolean;
  /** Whether guests can modify the event. */
  guestsCanModify?: boolean;
  /** Whether guests can see the guest list. */
  guestsCanSeeOtherGuests?: boolean;
  /** Comma- or newline-separated attachment URLs (maximum 25). */
  attachmentUrls?: string;
  /**
   * Immutable event type. Special types may only be supported by Google Workspace calendars.
   * Birthday, working-location, focus-time and out-of-office events have additional constraints.
   */
  eventType?: "default" | "birthday" | "focusTime" | "outOfOffice" | "workingLocation";
  /** Focus-time invitation handling. */
  focusTimeAutoDeclineMode?:
    | "declineNone"
    | "declineAllConflictingInvitations"
    | "declineOnlyNewConflictingInvitations";
  /** Chat status during focus time. */
  focusTimeChatStatus?: "available" | "doNotDisturb";
  /** Auto-decline message for focus time. */
  focusTimeDeclineMessage?: string;
  /** Out-of-office invitation handling. */
  outOfOfficeAutoDeclineMode?:
    | "declineNone"
    | "declineAllConflictingInvitations"
    | "declineOnlyNewConflictingInvitations";
  /** Auto-decline message for out-of-office. */
  outOfOfficeDeclineMessage?: string;
  /** Working-location kind. */
  workingLocationType?: "homeOffice" | "officeLocation" | "customLocation";
  /** Display label for an office or custom working location. */
  workingLocationLabel?: string;
  /** Office building identifier. */
  workingLocationBuildingId?: string;
  /** Office floor identifier. */
  workingLocationFloorId?: string;
  /** Office floor-section identifier. */
  workingLocationFloorSectionId?: string;
  /** Office desk identifier. */
  workingLocationDeskId?: string;
  /** Add a new Google Meet conference. */
  addGoogleMeetLink?: boolean;
  /** Calendar ID from list-calendars. Defaults to "primary". */
  calendarId?: string;
  /** Guest notification level. Defaults to the extension preference. */
  notificationLevel?: "all" | "externalOnly" | "none";
};

const preferences = getPreferenceValues<Preferences>();

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Create this Google Calendar event?",
  info: describeEventInput({
    ...input,
    conferenceAction: input.addGoogleMeetLink ? "add" : undefined,
  }),
});

const tool = async (input: Input) => {
  const calendar = getCalendarClient();
  const writeInput = {
    ...input,
    conferenceAction: input.addGoogleMeetLink ? ("add" as const) : undefined,
  };
  const calendarId = input.calendarId ?? "primary";
  const labels = input.eventLabelId !== undefined ? getEventLabels(await getCalendarWithLabels(calendarId)) : undefined;
  if (input.eventLabelId) requireLabel(labels ?? [], input.eventLabelId);
  const requestBody = buildEventResource(writeInput, {
    isCreate: true,
    defaultDurationMinutes: Number(preferences.defaultEventDuration ?? 30),
    addSignature: Boolean(preferences.addSignature),
  });
  const requestParams: calendar_v3.Params$Resource$Events$Insert & Partial<EventLabelVersionParams> = {
    calendarId,
    requestBody,
    conferenceDataVersion: hasConferenceChanges(writeInput) ? 1 : undefined,
    supportsAttachments: hasAttachmentChanges(writeInput) ? true : undefined,
    sendUpdates: getNotificationLevel(input, preferences.sendInvitations),
    eventLabelVersion: input.eventLabelId !== undefined ? 1 : undefined,
  };
  const response = await calendar.events.insert(requestParams);
  return serializeEvent(response.data, calendarId, labels);
};

export default withGoogleAPIs(tool);
