import { calendar_v3 } from "@googleapis/calendar";
import { getCalendarClient } from "./google";
import type { EventLabel } from "./calendar-values";

export { assertNonEmpty, assertTimeZone, normalizeHexColor, requireLabel } from "./calendar-values";
export type { EventLabel } from "./calendar-values";

export type CalendarWithLabels = calendar_v3.Schema$Calendar & {
  labelProperties?: { eventLabels?: EventLabel[] | null } | null;
};

export type EventWithLabel = calendar_v3.Schema$Event & {
  eventLabelId?: string | null;
};

export type EventLabelVersionParams = { eventLabelVersion: 1 };
export type OrganizationListParams = { showOwnOrganizationOnly?: boolean };

export function serializeCalendar(calendar: CalendarWithLabels) {
  return {
    id: calendar.id,
    summary: calendar.summary,
    description: calendar.description,
    location: calendar.location,
    timeZone: calendar.timeZone,
    dataOwner: calendar.dataOwner,
    autoAcceptInvitations: calendar.autoAcceptInvitations,
    conferenceProperties: calendar.conferenceProperties,
    labels: calendar.labelProperties?.eventLabels ?? [],
    etag: calendar.etag,
  };
}

export function serializeCalendarListEntry(entry: calendar_v3.Schema$CalendarListEntry) {
  return {
    id: entry.id,
    summary: entry.summary,
    summaryOverride: entry.summaryOverride,
    description: entry.description,
    location: entry.location,
    timeZone: entry.timeZone,
    dataOwner: entry.dataOwner,
    primary: entry.primary,
    deleted: entry.deleted,
    hidden: entry.hidden ?? false,
    selected: entry.selected ?? false,
    accessRole: entry.accessRole,
    color: {
      id: entry.colorId,
      background: entry.backgroundColor,
      foreground: entry.foregroundColor,
    },
    defaultReminders: entry.defaultReminders ?? [],
    notificationSettings: entry.notificationSettings?.notifications ?? [],
    conferenceProperties: entry.conferenceProperties,
    autoAcceptInvitations: entry.autoAcceptInvitations,
    etag: entry.etag,
  };
}

export function serializeAclRule(rule: calendar_v3.Schema$AclRule) {
  return {
    id: rule.id,
    role: rule.role,
    scope: rule.scope,
    etag: rule.etag,
  };
}

export async function requireCalendarOwner(calendarId: string) {
  const entry = await getCalendarClient().calendarList.get({ calendarId });
  if (entry.data.accessRole !== "owner") {
    throw new Error(`Owner access is required for calendar "${calendarId}".`);
  }
  return entry.data;
}

export function getEventLabels(calendar: CalendarWithLabels) {
  return [...(calendar.labelProperties?.eventLabels ?? [])];
}

export function writableCalendarListEntry(entry: calendar_v3.Schema$CalendarListEntry) {
  return {
    id: entry.id,
    summaryOverride: entry.summaryOverride,
    colorId: entry.colorId,
    backgroundColor: entry.backgroundColor,
    foregroundColor: entry.foregroundColor,
    hidden: entry.hidden,
    selected: entry.selected,
    defaultReminders: entry.defaultReminders,
    notificationSettings: entry.notificationSettings,
  } satisfies calendar_v3.Schema$CalendarListEntry;
}

export async function getCalendarWithLabels(calendarId: string) {
  const response = await getCalendarClient().calendars.get({ calendarId });
  return response.data as CalendarWithLabels;
}

export async function replaceEventLabels(calendarId: string, current: CalendarWithLabels, labels: EventLabel[]) {
  if (!current.summary) throw new Error("The calendar has no summary and cannot be safely updated.");
  const requestBody = {
    summary: current.summary,
    ...(current.description !== undefined ? { description: current.description } : {}),
    ...(current.location !== undefined ? { location: current.location } : {}),
    ...(current.timeZone !== undefined ? { timeZone: current.timeZone } : {}),
    labelProperties: { eventLabels: labels },
  } as CalendarWithLabels;
  const response = await getCalendarClient().calendars.update(
    { calendarId, requestBody },
    current.etag ? { headers: { "If-Match": current.etag } } : undefined,
  );
  return response.data as CalendarWithLabels;
}
