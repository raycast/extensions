import type { calendar_v3 } from "@googleapis/calendar";
import { randomUUID } from "node:crypto";
import { addRaycastSignature, colorIdToName, parseAttendeeEmails, resolveColorId } from "./event-values";
import type { EventLabel, EventWithLabel } from "./calendar-resources";

export type NotificationLevel = "all" | "externalOnly" | "none";
export type EventType = "default" | "birthday" | "focusTime" | "outOfOffice" | "workingLocation";

export interface EventWriteInput {
  title?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  durationDays?: number;
  allDay?: boolean;
  timeZone?: string;
  attendees?: string;
  requiredAttendees?: string;
  optionalAttendees?: string;
  resourceAttendees?: string;
  recurrence?: string;
  visibility?: "default" | "public" | "private" | "confidential";
  transparency?: "opaque" | "transparent";
  status?: "confirmed" | "tentative" | "cancelled";
  color?: string;
  eventLabelId?: string;
  useDefaultReminders?: boolean;
  popupReminderMinutes?: string;
  emailReminderMinutes?: string;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  attachmentUrls?: string;
  eventType?: EventType;
  birthdayType?: "birthday";
  focusTimeAutoDeclineMode?:
    | "declineNone"
    | "declineAllConflictingInvitations"
    | "declineOnlyNewConflictingInvitations";
  focusTimeChatStatus?: "available" | "doNotDisturb";
  focusTimeDeclineMessage?: string;
  outOfOfficeAutoDeclineMode?:
    | "declineNone"
    | "declineAllConflictingInvitations"
    | "declineOnlyNewConflictingInvitations";
  outOfOfficeDeclineMessage?: string;
  workingLocationType?: "homeOffice" | "officeLocation" | "customLocation";
  workingLocationLabel?: string;
  workingLocationBuildingId?: string;
  workingLocationFloorId?: string;
  workingLocationFloorSectionId?: string;
  workingLocationDeskId?: string;
  conferenceAction?: "keep" | "add" | "remove";
}

type BuildOptions = {
  existing?: calendar_v3.Schema$Event;
  defaultDurationMinutes?: number;
  isCreate?: boolean;
  addSignature?: boolean;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RFC3339_PATTERN = /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i;

function hasAnyDefined(input: object, keys: string[]) {
  return keys.some((key) => (input as Record<string, unknown>)[key] !== undefined);
}

function parseIntegerList(value: string | undefined, label: string): number[] {
  if (value === undefined || value.trim() === "") return [];
  const values = value
    .split(/[,\n;]/)
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
  if (values.some((minutes) => !Number.isInteger(minutes) || minutes < 0 || minutes > 40320)) {
    throw new Error(`${label} must contain whole minutes from 0 to 40320.`);
  }
  if (values.length !== value.split(/[,\n;]/).filter((item) => item.trim()).length) {
    throw new Error(`${label} contains an invalid number.`);
  }
  return values;
}

function parseEmails(value: string | undefined, label: string) {
  const { emails, invalidEntries } = parseAttendeeEmails(value);
  if (invalidEntries.length > 0) {
    throw new Error(`Invalid ${label}: ${invalidEntries.join(", ")}`);
  }
  return emails;
}

function buildAttendees(
  input: EventWriteInput,
  existing?: calendar_v3.Schema$Event,
): calendar_v3.Schema$EventAttendee[] | undefined {
  const keys = ["attendees", "requiredAttendees", "optionalAttendees", "resourceAttendees"];
  if (!hasAnyDefined(input, keys)) return undefined;

  const attendees = new Map<string, calendar_v3.Schema$EventAttendee>();
  for (const attendee of existing?.attendees ?? []) {
    if (attendee.email) attendees.set(attendee.email.toLowerCase(), { ...attendee });
  }

  const add = (emails: string[], properties: Partial<calendar_v3.Schema$EventAttendee>) => {
    for (const email of emails) {
      const key = email.toLowerCase();
      const existingAttendee = attendees.get(key);
      attendees.set(
        key,
        existingAttendee
          ? { ...existingAttendee, email, ...properties }
          : { email, optional: false, resource: false, ...properties },
      );
    }
  };
  const removeMatching = (predicate: (attendee: calendar_v3.Schema$EventAttendee) => boolean) => {
    for (const [key, attendee] of attendees) {
      if (predicate(attendee)) attendees.delete(key);
    }
  };
  const applyField = (
    value: string | undefined,
    label: string,
    properties: Partial<calendar_v3.Schema$EventAttendee>,
    matches: (attendee: calendar_v3.Schema$EventAttendee) => boolean,
  ) => {
    if (value === undefined) return;
    if (value === "") {
      removeMatching(matches);
      return;
    }
    add(parseEmails(value, label), properties);
  };

  applyField(input.attendees, "attendee email", {}, (attendee) => !attendee.optional && !attendee.resource);
  applyField(
    input.requiredAttendees,
    "required attendee email",
    {},
    (attendee) => !attendee.optional && !attendee.resource,
  );
  applyField(input.optionalAttendees, "optional attendee email", { optional: true, resource: false }, (attendee) =>
    Boolean(attendee.optional),
  );
  applyField(input.resourceAttendees, "resource attendee email", { optional: false, resource: true }, (attendee) =>
    Boolean(attendee.resource),
  );
  return [...attendees.values()];
}

function addUtcDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function dateDurationDays(start: string, end: string) {
  return Math.max(1, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000));
}

function assertTimeZone(timeZone: string | undefined) {
  if (!timeZone) return;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    throw new Error(`Invalid IANA time zone "${timeZone}".`);
  }
}

function buildSchedule(input: EventWriteInput, options: BuildOptions) {
  const existing = options.existing;
  const scheduleTouched =
    options.isCreate ||
    hasAnyDefined(input, ["startDate", "endDate", "duration", "durationDays", "allDay", "timeZone"]);
  if (!scheduleTouched) return undefined;

  assertTimeZone(input.timeZone);
  const existingAllDay = Boolean(existing?.start?.date);
  const allDay = input.allDay ?? existingAllDay;

  if (input.allDay !== undefined && input.allDay !== existingAllDay && !input.startDate) {
    throw new Error("startDate is required when changing between timed and all-day events.");
  }

  if (allDay) {
    const start = input.startDate ?? existing?.start?.date;
    if (!start || !DATE_PATTERN.test(start)) {
      throw new Error("All-day startDate must use YYYY-MM-DD.");
    }
    if (input.duration !== undefined) throw new Error("Use durationDays, not duration, for all-day events.");
    const previousDays =
      existing?.start?.date && existing.end?.date ? dateDurationDays(existing.start.date, existing.end.date) : 1;
    const days = input.durationDays ?? previousDays;
    if (!Number.isInteger(days) || days < 1) throw new Error("durationDays must be a positive whole number.");
    const end = input.endDate ?? addUtcDays(start, days);
    if (!DATE_PATTERN.test(end) || end <= start) {
      throw new Error("All-day endDate must use YYYY-MM-DD and be after startDate (the end date is exclusive).");
    }
    return { start: { date: start }, end: { date: end } };
  }

  const start = input.startDate ?? existing?.start?.dateTime;
  if (!start || !RFC3339_PATTERN.test(start) || Number.isNaN(Date.parse(start))) {
    throw new Error("Timed startDate must be an RFC3339 datetime with Z or a numeric UTC offset.");
  }
  if (input.durationDays !== undefined) throw new Error("Use duration, not durationDays, for timed events.");

  const previousDuration =
    existing?.start?.dateTime && existing.end?.dateTime
      ? (Date.parse(existing.end.dateTime) - Date.parse(existing.start.dateTime)) / 60000
      : options.defaultDurationMinutes;
  const duration = input.duration ?? previousDuration;
  const end =
    input.endDate ??
    (duration !== undefined && duration > 0 ? new Date(Date.parse(start) + duration * 60000).toISOString() : undefined);
  if (!end || !RFC3339_PATTERN.test(end) || Number.isNaN(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) {
    throw new Error("Provide an endDate after startDate or a positive duration.");
  }

  const timeZone =
    input.timeZone !== undefined ? (input.timeZone === "" ? null : input.timeZone) : existing?.start?.timeZone;
  return {
    start: { dateTime: start, ...(timeZone !== undefined ? { timeZone } : {}) },
    end: { dateTime: end, ...(timeZone !== undefined ? { timeZone } : {}) },
  };
}

function buildReminders(input: EventWriteInput) {
  if (!hasAnyDefined(input, ["useDefaultReminders", "popupReminderMinutes", "emailReminderMinutes"])) return undefined;
  const overrides: calendar_v3.Schema$EventReminder[] = [
    ...parseIntegerList(input.popupReminderMinutes, "popupReminderMinutes").map((minutes) => ({
      method: "popup",
      minutes,
    })),
    ...parseIntegerList(input.emailReminderMinutes, "emailReminderMinutes").map((minutes) => ({
      method: "email",
      minutes,
    })),
  ];
  if (input.useDefaultReminders && overrides.length > 0) {
    throw new Error("Custom reminders cannot be combined with useDefaultReminders=true.");
  }
  return { useDefault: input.useDefaultReminders ?? false, overrides };
}

function buildAttachments(value: string | undefined) {
  if (value === undefined) return undefined;
  const urls = value
    .split(/[,\n]/)
    .map((url) => url.trim())
    .filter(Boolean);
  if (urls.length > 25) throw new Error("Google Calendar supports at most 25 attachments per event.");
  for (const url of urls) {
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid attachment URL "${url}".`);
    }
  }
  return urls.map((fileUrl) => ({ fileUrl }));
}

function buildRecurrence(value: string | undefined) {
  if (value === undefined) return undefined;
  return value
    .split(/\r?\n/)
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const normalized = /^FREQ=/i.test(rule) ? `RRULE:${rule}` : rule;
      if (/^(DTSTART|DTEND)(?:;[^:]*)?:/i.test(normalized)) {
        throw new Error("Recurrence must not include DTSTART or DTEND; use startDate and endDate instead.");
      }
      if (!/^(RRULE|EXRULE|RDATE(?:;[^:]*)?|EXDATE(?:;[^:]*)?):.+/i.test(normalized)) {
        throw new Error(`Invalid recurrence rule "${rule}".`);
      }
      if (/^(RRULE|EXRULE):/i.test(normalized) && !/(?:^|;)FREQ=[A-Z]+(?:;|$)/i.test(normalized.split(":")[1])) {
        throw new Error(`Recurrence rule "${rule}" must include FREQ.`);
      }
      return normalized;
    });
}

function buildTypeProperties(input: EventWriteInput, existing?: calendar_v3.Schema$Event) {
  const eventType = input.eventType ?? (existing?.eventType as EventType | undefined) ?? "default";
  const properties: calendar_v3.Schema$Event = {};
  const hasFocusTimeProperties = hasAnyDefined(input, [
    "focusTimeAutoDeclineMode",
    "focusTimeChatStatus",
    "focusTimeDeclineMessage",
  ]);
  const hasOutOfOfficeProperties = hasAnyDefined(input, ["outOfOfficeAutoDeclineMode", "outOfOfficeDeclineMessage"]);
  const hasWorkingLocationProperties = hasAnyDefined(input, [
    "workingLocationType",
    "workingLocationLabel",
    "workingLocationBuildingId",
    "workingLocationFloorId",
    "workingLocationFloorSectionId",
    "workingLocationDeskId",
  ]);

  if (input.eventType !== undefined && existing?.eventType && input.eventType !== existing.eventType) {
    throw new Error(`eventType is immutable; this event is already "${existing.eventType}".`);
  }
  if (hasFocusTimeProperties && eventType !== "focusTime") {
    throw new Error("Focus-time properties require eventType=focusTime.");
  }
  if (hasOutOfOfficeProperties && eventType !== "outOfOffice") {
    throw new Error("Out-of-office properties require eventType=outOfOffice.");
  }
  if (hasWorkingLocationProperties && eventType !== "workingLocation") {
    throw new Error("Working-location properties require eventType=workingLocation.");
  }
  if (input.eventType !== undefined && !existing) properties.eventType = input.eventType;
  if (eventType === "workingLocation" && !existing && input.workingLocationType === undefined) {
    throw new Error("workingLocationType is required when creating a working-location event.");
  }

  if (eventType === "birthday" && (input.birthdayType !== undefined || !existing)) {
    properties.birthdayProperties = { type: input.birthdayType ?? "birthday" };
  }
  if (eventType === "focusTime" && hasFocusTimeProperties) {
    properties.focusTimeProperties = {
      ...(input.focusTimeAutoDeclineMode !== undefined ? { autoDeclineMode: input.focusTimeAutoDeclineMode } : {}),
      ...(input.focusTimeChatStatus !== undefined ? { chatStatus: input.focusTimeChatStatus } : {}),
      ...(input.focusTimeDeclineMessage !== undefined ? { declineMessage: input.focusTimeDeclineMessage } : {}),
    };
  }
  if (eventType === "outOfOffice" && hasOutOfOfficeProperties) {
    properties.outOfOfficeProperties = {
      ...(input.outOfOfficeAutoDeclineMode !== undefined ? { autoDeclineMode: input.outOfOfficeAutoDeclineMode } : {}),
      ...(input.outOfOfficeDeclineMessage !== undefined ? { declineMessage: input.outOfOfficeDeclineMessage } : {}),
    };
  }
  if (eventType === "workingLocation" && hasWorkingLocationProperties) {
    const type = input.workingLocationType ?? existing?.workingLocationProperties?.type;
    if (!type) throw new Error("workingLocationType is required for a working-location event.");
    properties.workingLocationProperties = {
      type,
      ...(type === "homeOffice" ? { homeOffice: {} } : {}),
      ...(type === "customLocation" ? { customLocation: { label: input.workingLocationLabel ?? "" } } : {}),
      ...(type === "officeLocation"
        ? {
            officeLocation: {
              ...(input.workingLocationLabel !== undefined ? { label: input.workingLocationLabel } : {}),
              ...(input.workingLocationBuildingId !== undefined ? { buildingId: input.workingLocationBuildingId } : {}),
              ...(input.workingLocationFloorId !== undefined ? { floorId: input.workingLocationFloorId } : {}),
              ...(input.workingLocationFloorSectionId !== undefined
                ? { floorSectionId: input.workingLocationFloorSectionId }
                : {}),
              ...(input.workingLocationDeskId !== undefined ? { deskId: input.workingLocationDeskId } : {}),
            },
          }
        : {}),
    };
  }
  return properties;
}

export function buildEventResource(input: EventWriteInput, options: BuildOptions = {}) {
  const body: EventWithLabel = {};
  const schedule = buildSchedule(input, options);
  const attendees = buildAttendees(input, options.existing);
  const reminders = buildReminders(input);
  const attachments = buildAttachments(input.attachmentUrls);
  const recurrence = buildRecurrence(input.recurrence);
  if (options.isCreate && recurrence?.length && !input.allDay && !input.timeZone) {
    throw new Error("timeZone is required for a timed recurring event.");
  }

  if (input.title !== undefined) body.summary = input.title;
  if (input.description !== undefined) {
    body.description =
      input.description === "" ? "" : addRaycastSignature(input.description, options.addSignature ?? false);
  } else if (options.isCreate) {
    body.description = addRaycastSignature(undefined, options.addSignature ?? false);
  }
  if (input.location !== undefined) body.location = input.location;
  if (schedule) Object.assign(body, schedule);
  if (attendees !== undefined) body.attendees = attendees;
  if (recurrence !== undefined) body.recurrence = recurrence;
  if (input.visibility !== undefined) body.visibility = input.visibility;
  if (input.transparency !== undefined) body.transparency = input.transparency;
  if (input.status !== undefined) body.status = input.status;
  if (input.color !== undefined && input.eventLabelId !== undefined) {
    throw new Error("color and eventLabelId cannot be used together. Custom labels supersede legacy event colors.");
  }
  if (input.color !== undefined) body.colorId = resolveColorId(input.color) ?? null;
  if (input.eventLabelId !== undefined) body.eventLabelId = input.eventLabelId;
  if (reminders !== undefined) body.reminders = reminders;
  if (input.guestsCanInviteOthers !== undefined) body.guestsCanInviteOthers = input.guestsCanInviteOthers;
  if (input.guestsCanModify !== undefined) body.guestsCanModify = input.guestsCanModify;
  if (input.guestsCanSeeOtherGuests !== undefined) body.guestsCanSeeOtherGuests = input.guestsCanSeeOtherGuests;
  if (attachments !== undefined) body.attachments = attachments;
  Object.assign(body, buildTypeProperties(input, options.existing));

  if (input.conferenceAction === "add") {
    body.conferenceData = {
      createRequest: { conferenceSolutionKey: { type: "hangoutsMeet" }, requestId: randomUUID() },
    };
  } else if (input.conferenceAction === "remove") {
    body.conferenceData = null as unknown as calendar_v3.Schema$ConferenceData;
  }
  return body;
}

export function hasAttachmentChanges(input: EventWriteInput) {
  return input.attachmentUrls !== undefined;
}

export function hasConferenceChanges(input: EventWriteInput) {
  return input.conferenceAction === "add" || input.conferenceAction === "remove";
}

export async function applyImportedEventLabel(
  patchLabel: () => Promise<EventWithLabel>,
  deleteImportedEvent: () => Promise<void>,
) {
  try {
    return await patchLabel();
  } catch (labelError) {
    try {
      await deleteImportedEvent();
    } catch (cleanupError) {
      throw new AggregateError(
        [labelError, cleanupError],
        "The event was imported, but label application and cleanup both failed. Do not retry.",
      );
    }
    throw labelError;
  }
}

export function getNotificationLevel(
  input: { notificationLevel?: NotificationLevel },
  fallback: unknown,
): NotificationLevel {
  return input.notificationLevel ?? (fallback as NotificationLevel | undefined) ?? "all";
}

export function serializeEvent(event: calendar_v3.Schema$Event, calendarId?: string, labels?: EventLabel[]) {
  const eventWithLabel = event as EventWithLabel;
  const label = labels?.find((candidate) => candidate.id === eventWithLabel.eventLabelId);
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;
  const durationMinutes =
    event.start?.dateTime && event.end?.dateTime
      ? (Date.parse(event.end.dateTime) - Date.parse(event.start.dateTime)) / 60000
      : undefined;
  const durationDays =
    event.start?.date && event.end?.date
      ? (Date.parse(`${event.end.date}T00:00:00Z`) - Date.parse(`${event.start.date}T00:00:00Z`)) / 86400000
      : undefined;
  return {
    id: event.id,
    calendarId,
    iCalUID: event.iCalUID,
    title: event.summary || "Untitled Event",
    description: event.description,
    location: event.location,
    status: event.status,
    eventType: event.eventType,
    start,
    end,
    allDay: Boolean(event.start?.date),
    timeZone: event.start?.timeZone ?? event.end?.timeZone,
    durationMinutes,
    durationDays,
    recurrence: event.recurrence,
    recurringEventId: event.recurringEventId,
    originalStart: event.originalStartTime?.dateTime ?? event.originalStartTime?.date,
    organizer: event.organizer,
    creator: event.creator,
    attendees:
      event.attendees?.map((attendee) => ({
        email: attendee.email,
        name: attendee.displayName,
        responseStatus: attendee.responseStatus,
        comment: attendee.comment,
        optional: attendee.optional,
        resource: attendee.resource,
        organizer: attendee.organizer,
        self: attendee.self,
        additionalGuests: attendee.additionalGuests,
      })) ?? [],
    visibility: event.visibility,
    transparency: event.transparency,
    color: event.colorId ? { id: event.colorId, name: colorIdToName(event.colorId) } : undefined,
    eventLabelId: eventWithLabel.eventLabelId,
    eventLabel: eventWithLabel.eventLabelId
      ? {
          id: eventWithLabel.eventLabelId,
          name: label?.name,
          backgroundColor: label?.backgroundColor,
        }
      : undefined,
    reminders: event.reminders,
    guestPermissions: {
      canInviteOthers: event.guestsCanInviteOthers,
      canModify: event.guestsCanModify,
      canSeeOtherGuests: event.guestsCanSeeOtherGuests,
    },
    conference: event.conferenceData
      ? {
          id: event.conferenceData.conferenceId,
          solution: event.conferenceData.conferenceSolution?.name,
          status: event.conferenceData.createRequest?.status?.statusCode,
          entryPoints: event.conferenceData.entryPoints?.map((entry) => ({
            type: entry.entryPointType,
            uri: entry.uri,
            label: entry.label,
          })),
        }
      : undefined,
    hangoutLink: event.hangoutLink,
    attachments: event.attachments,
    focusTimeProperties: event.focusTimeProperties,
    outOfOfficeProperties: event.outOfOfficeProperties,
    workingLocationProperties: event.workingLocationProperties,
    birthdayProperties: event.birthdayProperties,
    htmlLink: event.htmlLink,
    created: event.created,
    updated: event.updated,
    sequence: event.sequence,
    locked: event.locked,
    privateCopy: event.privateCopy,
  };
}

export function describeEventInput(input: EventWriteInput) {
  const display = (value: string | undefined) => (value === "" ? "(clear)" : value);
  const reminders =
    input.useDefaultReminders !== undefined ||
    input.popupReminderMinutes !== undefined ||
    input.emailReminderMinutes !== undefined
      ? input.useDefaultReminders
        ? "Calendar defaults"
        : `Popup: ${input.popupReminderMinutes || "none"}; email: ${input.emailReminderMinutes || "none"}`
      : undefined;
  return [
    { name: "Title", value: display(input.title) },
    { name: "Description", value: display(input.description) },
    { name: "Start", value: input.startDate },
    { name: "End", value: input.endDate },
    {
      name: "Length",
      value: input.allDay
        ? input.durationDays
          ? `${input.durationDays} day(s)`
          : undefined
        : input.duration
          ? `${input.duration} minutes`
          : undefined,
    },
    { name: "Time Zone", value: input.timeZone },
    { name: "Location", value: display(input.location) },
    { name: "Required Guests", value: display(input.requiredAttendees ?? input.attendees) },
    { name: "Optional Guests", value: display(input.optionalAttendees) },
    { name: "Resources", value: display(input.resourceAttendees) },
    { name: "Recurrence", value: display(input.recurrence) },
    { name: "Visibility", value: input.visibility },
    { name: "Availability", value: input.transparency },
    { name: "Status", value: input.status },
    { name: "Color", value: display(input.color) },
    { name: "Custom Label ID", value: display(input.eventLabelId) },
    { name: "Reminders", value: reminders },
    { name: "Guest Can Invite", value: input.guestsCanInviteOthers?.toString() },
    { name: "Guests Can Modify", value: input.guestsCanModify?.toString() },
    { name: "Guests See Guest List", value: input.guestsCanSeeOtherGuests?.toString() },
    { name: "Attachments", value: display(input.attachmentUrls) },
    { name: "Event Type", value: input.eventType },
    { name: "Focus Auto-decline", value: input.focusTimeAutoDeclineMode },
    { name: "Focus Chat Status", value: input.focusTimeChatStatus },
    { name: "Focus Decline Message", value: display(input.focusTimeDeclineMessage) },
    { name: "Out of Office Auto-decline", value: input.outOfOfficeAutoDeclineMode },
    { name: "Out of Office Message", value: display(input.outOfOfficeDeclineMessage) },
    { name: "Working Location Type", value: input.workingLocationType },
    { name: "Working Location Label", value: display(input.workingLocationLabel) },
    { name: "Google Meet", value: input.conferenceAction },
  ].filter((item) => item.value !== undefined);
}
