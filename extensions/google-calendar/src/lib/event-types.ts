export const ALL_LISTABLE_EVENT_TYPES = [
  "default",
  "focusTime",
  "outOfOffice",
  "workingLocation",
  "fromGmail",
  "birthday",
] as const;

export type ListableEventType = (typeof ALL_LISTABLE_EVENT_TYPES)[number];

export const SCHEDULE_EVENT_TYPES: ListableEventType[] = [
  "default",
  "focusTime",
  "outOfOffice",
  "workingLocation",
  "fromGmail",
];

export const BIRTHDAYS_VIEW_CALENDAR_ID = "birthdays";

export function isContactsBirthdaysCalendar(calendarId?: string | null): boolean {
  const id = calendarId ?? "";
  return id.includes("addressbook#contacts") || id.includes("#contacts@group");
}

export function isBirthdaysView(calendarId?: string | null): boolean {
  return calendarId === BIRTHDAYS_VIEW_CALENDAR_ID || isContactsBirthdaysCalendar(calendarId);
}

export function resolvePickerCalendarId(calendarId?: string | null): string | undefined {
  if (!calendarId) return undefined;
  return isContactsBirthdaysCalendar(calendarId) ? BIRTHDAYS_VIEW_CALENDAR_ID : calendarId;
}

export function resolveCalendarIdForEventsList(calendarId?: string | null): string {
  if (!calendarId || calendarId === BIRTHDAYS_VIEW_CALENDAR_ID) {
    return "primary";
  }

  return calendarId;
}

/**
 * Google stores Contacts birthdays on the primary calendar as `eventType: "birthday"`.
 * Leaving `eventTypes` unset returns them mixed into the schedule and can fill the first pages.
 *
 * @see https://developers.google.com/workspace/calendar/api/guides/event-types
 */
export function resolveEventTypesForList({
  calendarId,
  showBirthdays,
}: {
  calendarId?: string | null;
  showBirthdays: boolean;
}): ListableEventType[] {
  if (isBirthdaysView(calendarId)) {
    return ["birthday"];
  }

  if (showBirthdays) {
    return [...ALL_LISTABLE_EVENT_TYPES];
  }

  return [...SCHEDULE_EVENT_TYPES];
}
