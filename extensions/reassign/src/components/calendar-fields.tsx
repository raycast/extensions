import { Form, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listCalendars } from "../lib/api";
import type { Calendar } from "../lib/schedule-model";

// Picker values that are not calendar ids. "" keeps the server default (omit
// `syncTo`); NONE forces a dial-only block (`syncTo: null`).
export const CALENDAR_DEFAULT = "";
export const CALENDAR_NONE = "__none";

// Both fields are absent when the form hides them, so readers take a Partial.
export interface CalendarFormValues {
  calendarId?: string;
  mirrorIds?: string[];
}

/** The write fields a calendar choice maps to. Both are omitted when unchanged. */
export interface CalendarWriteFields {
  syncTo?: string | null;
  mirrorTo?: string[];
}

/** The connected calendars, cached across launches. Empty until the first read. */
export function useCalendars() {
  const { data, isLoading } = useCachedPromise(listCalendars, [], { keepPreviousData: true });
  const calendars = data?.ok ? (data.data.calendars ?? []) : [];
  const writable = calendars.filter((c) => c.writable);
  const defaultId = data?.ok ? (data.data.defaultCalendarId ?? undefined) : undefined;
  return { calendars, writable, defaultId, isLoading };
}

/**
 * Translate the picker values into `syncTo` / `mirrorTo` for a create. A kept
 * default sends nothing, so the server picks its own home calendar. The mirror
 * list drops the home calendar, so a block never mirrors to itself.
 */
export function calendarCreateFields(values: CalendarFormValues): CalendarWriteFields {
  const out: CalendarWriteFields = {};
  if (values.calendarId === CALENDAR_NONE) out.syncTo = null;
  else if (values.calendarId) out.syncTo = values.calendarId;
  const mirrors = (values.mirrorIds ?? []).filter((id) => id !== values.calendarId);
  if (mirrors.length > 0) out.mirrorTo = mirrors;
  return out;
}

/** The same translation for an edit: send only what differs from the block. */
export function calendarEditFields(
  values: CalendarFormValues,
  current: { calendarId?: string; mirrorIds?: string[] },
): CalendarWriteFields {
  const out: CalendarWriteFields = {};
  // A hidden picker (no writable calendar) changes nothing.
  if (values.calendarId === undefined) return out;
  const currentCal = current.calendarId ?? CALENDAR_NONE;
  if (values.calendarId !== currentCal) {
    out.syncTo = values.calendarId === CALENDAR_NONE ? null : values.calendarId;
  }
  const home = out.syncTo ?? current.calendarId;
  // A hidden mirror picker (one writable calendar) keeps the current mirrors.
  if (values.mirrorIds === undefined) return out;
  const mirrors = values.mirrorIds.filter((id) => id !== home);
  if (!sameSet(mirrors, current.mirrorIds ?? [])) out.mirrorTo = mirrors;
  return out;
}

/** True when a choice asks for a calendar change (so a no-op form can skip it). */
export function hasCalendarChange(fields: CalendarWriteFields): boolean {
  return fields.syncTo !== undefined || fields.mirrorTo !== undefined;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((id) => set.has(id));
}

/**
 * The "Calendar" and "Mirror to" form fields. Renders nothing without a writable
 * calendar. The mirror picker needs a second writable calendar to mirror to.
 * `allowDefault` adds a "Default" choice for a create (an edit knows the home).
 */
export function CalendarFields(props: {
  writable: Calendar[];
  defaultId?: string;
  allowDefault: boolean;
  calendarDefault: string;
  mirrorDefault: string[];
}) {
  const { writable, defaultId, allowDefault, calendarDefault, mirrorDefault } = props;
  if (writable.length === 0) return null;
  const home = writable.find((c) => c.id === defaultId) ?? writable.find((c) => c.isDefault);
  return (
    <>
      <Form.Dropdown
        id="calendarId"
        title="Calendar"
        defaultValue={calendarDefault}
        info="Publish the block to a connected calendar, or keep it on the dial only."
      >
        {allowDefault && (
          <Form.Dropdown.Item
            value={CALENDAR_DEFAULT}
            title={home ? `Default (${home.name})` : "Default"}
            icon={Icon.Calendar}
          />
        )}
        <Form.Dropdown.Item value={CALENDAR_NONE} title="Dial only" icon={Icon.Circle} />
        {writable.map((calendar) => (
          <Form.Dropdown.Item
            key={calendar.id}
            value={calendar.id}
            title={calendarTitle(calendar)}
            icon={icon(calendar)}
          />
        ))}
      </Form.Dropdown>
      {writable.length > 1 && (
        <Form.TagPicker
          id="mirrorIds"
          title="Mirror to"
          defaultValue={mirrorDefault}
          info="Also send a one-way copy to these calendars."
        >
          {writable.map((calendar) => (
            <Form.TagPicker.Item
              key={calendar.id}
              value={calendar.id}
              title={calendarTitle(calendar)}
              icon={icon(calendar)}
            />
          ))}
        </Form.TagPicker>
      )}
    </>
  );
}

/** "Work · leo@example.com" — the account disambiguates same-named calendars. */
function calendarTitle(calendar: Calendar): string {
  return calendar.account ? `${calendar.name} · ${calendar.account}` : calendar.name;
}

function icon(calendar: Calendar) {
  return { source: Icon.Dot, tintColor: calendar.color ?? undefined };
}
