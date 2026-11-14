import { Form, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listCalendars } from "../lib/api";
import { MIRROR_STYLE_LABELS, type Calendar } from "../lib/schedule-model";
import { isMirrorStyle, type MirrorStyle } from "../lib/wire";

// Picker values that are not calendar ids. "" keeps the server default (omit
// `calendarId`); NONE keeps the block in Reassign only (`calendarId: null`).
export const CALENDAR_DEFAULT = "";
export const CALENDAR_NONE = "__none";
// Copy style values that are not a style. "" uses each calendar's default copy
// style; MIXED keeps the per-copy styles of the event as they are.
export const MIRROR_STYLE_DEFAULT = "";
export const MIRROR_STYLE_MIXED = "__mixed";

// The fields are absent when the form hides them, so readers take a Partial.
export interface CalendarFormValues {
  calendarId?: string;
  mirrorIds?: string[];
  mirrorStyle?: string;
}

/** The write fields a calendar choice maps to. Each is omitted when unchanged. */
export interface CalendarWriteFields {
  calendarId?: string | null;
  mirrorCalendarIds?: string[];
  mirrorStyles?: Record<string, MirrorStyle>;
}

function asMirrorStyle(value: string | undefined): MirrorStyle | undefined {
  return isMirrorStyle(value) ? value : undefined;
}

/** The style dropdown value for a set of copies: their shared style, else MIXED. */
export function mirrorStyleChoice(mirrorIds: string[], styles: Record<string, MirrorStyle> | undefined): string {
  const values = new Set(mirrorIds.map((id) => styles?.[id] ?? MIRROR_STYLE_DEFAULT));
  // A style that this client does not know shows as Mixed, which keeps the map.
  if (values.size > 1 || [...values].some((v) => v !== MIRROR_STYLE_DEFAULT && !isMirrorStyle(v)))
    return MIRROR_STYLE_MIXED;
  return values.values().next().value ?? MIRROR_STYLE_DEFAULT;
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
 * Translate the picker values into `calendarId` / `mirrorCalendarIds` for a create. A kept
 * default sends nothing, so the server picks its own home calendar. The mirror
 * list drops the home calendar, so a block never mirrors to itself.
 */
export function calendarCreateFields(values: CalendarFormValues): CalendarWriteFields {
  const out: CalendarWriteFields = {};
  if (values.calendarId === CALENDAR_NONE) out.calendarId = null;
  else if (values.calendarId) out.calendarId = values.calendarId;
  // A Reassign-only one-off block may have mirrors too; the server accepts them.
  const mirrors = (values.mirrorIds ?? []).filter((id) => id !== values.calendarId);
  if (mirrors.length > 0) out.mirrorCalendarIds = mirrors;
  // "Calendar default" sends no map, so each calendar uses its own copy style.
  const style = asMirrorStyle(values.mirrorStyle);
  if (style && mirrors.length > 0) out.mirrorStyles = Object.fromEntries(mirrors.map((id) => [id, style]));
  return out;
}

/**
 * The same translation for an edit: send only what differs from the block.
 * `mirrorIds` are the mirrors the picker shows; `hiddenMirrorIds` stay as they are.
 */
export function calendarEditFields(
  values: CalendarFormValues,
  current: {
    calendarId?: string | null;
    mirrorIds?: string[];
    hiddenMirrorIds?: string[];
    mirrorStyles?: Record<string, MirrorStyle>;
  },
): CalendarWriteFields {
  const out: CalendarWriteFields = {};
  // A hidden picker (no writable calendar) changes nothing.
  if (values.calendarId === undefined) return out;
  const currentCal = current.calendarId ?? CALENDAR_NONE;
  if (values.calendarId !== currentCal) {
    out.calendarId = values.calendarId === CALENDAR_NONE ? null : values.calendarId;
  }
  // An unlink removes the mirrors on the server and takes no mirror field.
  if (out.calendarId === null && current.calendarId) return out;
  const home = out.calendarId === undefined ? current.calendarId : out.calendarId;
  // A hidden mirror picker keeps the current mirrors.
  const shown = current.mirrorIds ?? [];
  const mirrors = values.mirrorIds?.filter((id) => id !== home);
  if (mirrors && !sameSet(mirrors, shown)) out.mirrorCalendarIds = mirrors;
  const styles = mirrorStylesEdit(values.mirrorStyle, mirrors ?? shown, current);
  if (styles) out.mirrorStyles = styles;
  return out;
}

/**
 * The new copy style map, or undefined when it does not change. The update
 * replaces the whole map, so it keeps the styles of the hidden mirrors.
 */
function mirrorStylesEdit(
  choice: string | undefined,
  shown: string[],
  current: { hiddenMirrorIds?: string[]; mirrorStyles?: Record<string, MirrorStyle> },
): Record<string, MirrorStyle> | undefined {
  if (choice === undefined || choice === MIRROR_STYLE_MIXED) return undefined;
  const style = asMirrorStyle(choice);
  const before = current.mirrorStyles ?? {};
  const next: Record<string, MirrorStyle> = {};
  for (const id of current.hiddenMirrorIds ?? []) if (before[id]) next[id] = before[id];
  if (style) for (const id of shown) next[id] = style;
  // Compare with the current map, less the keys of the removed mirrors.
  const kept = new Set([...shown, ...(current.hiddenMirrorIds ?? [])]);
  const prior = Object.entries(before).filter(([id]) => kept.has(id));
  const same = prior.length === Object.keys(next).length && prior.every(([id, s]) => next[id] === s);
  return same ? undefined : next;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((id) => set.has(id));
}

/**
 * The "Calendar", "Mirror to", and "Copies show" fields; nothing without a writable calendar.
 * `mirrorsWithoutHome` (default true) shows mirrors for a Reassign-only block: a series needs a home.
 */
export function CalendarFields(props: {
  writable: Calendar[];
  defaultId?: string;
  allowDefault: boolean;
  calendarDefault: string;
  mirrorDefault: string[];
  styleDefault?: string;
  allowMixed?: boolean;
  mirrorsWithoutHome?: boolean;
  onChange?: (values: CalendarFormValues) => void;
}) {
  const { writable, defaultId, allowDefault, calendarDefault, mirrorDefault, mirrorsWithoutHome = true } = props;
  // Controlled, so the mirror picker can follow the chosen home.
  const [chosen, setChosen] = useState(calendarDefault);
  const [mirrors, setMirrors] = useState(mirrorDefault);
  const [style, setStyle] = useState(props.styleDefault ?? MIRROR_STYLE_DEFAULT);
  if (writable.length === 0) return null;
  const home = writable.find((c) => c.id === defaultId);
  const homeId = chosen === CALENDAR_DEFAULT ? home?.id : chosen;
  const mirrorChoices = writable.filter((c) => c.id !== homeId);
  const showMirrors = (chosen !== CALENDAR_NONE || mirrorsWithoutHome) && mirrorChoices.length > 0;
  const shownMirrors = mirrors.filter((id) => id !== homeId);
  return (
    <>
      <Form.Dropdown
        id="calendarId"
        title="Calendar"
        value={chosen}
        onChange={(calendarId) => {
          setChosen(calendarId);
          const nextMirrors =
            calendarId === CALENDAR_NONE && !mirrorsWithoutHome
              ? []
              : mirrors.filter((id) => id !== (calendarId || home?.id));
          setMirrors(nextMirrors);
          props.onChange?.({ calendarId, mirrorIds: nextMirrors, mirrorStyle: style });
        }}
        info="Publish the block to a connected calendar, or keep it in Reassign only."
      >
        {allowDefault && (
          <Form.Dropdown.Item
            value={CALENDAR_DEFAULT}
            title={home ? `Default (${home.name})` : "Default"}
            icon={Icon.Calendar}
          />
        )}
        <Form.Dropdown.Item value={CALENDAR_NONE} title="Reassign" icon="icon.png" />
        {writable.map((calendar) => (
          <Form.Dropdown.Item
            key={calendar.id}
            value={calendar.id}
            title={calendarTitle(calendar)}
            icon={icon(calendar)}
          />
        ))}
      </Form.Dropdown>
      {showMirrors && (
        <Form.TagPicker
          id="mirrorIds"
          title="Mirror to"
          value={shownMirrors}
          onChange={(mirrorIds) => {
            setMirrors(mirrorIds);
            props.onChange?.({ calendarId: chosen, mirrorIds, mirrorStyle: style });
          }}
          info="Also send a one-way copy to these calendars."
        >
          {mirrorChoices.map((calendar) => (
            <Form.TagPicker.Item
              key={calendar.id}
              value={calendar.id}
              title={calendarTitle(calendar)}
              icon={icon(calendar)}
            />
          ))}
        </Form.TagPicker>
      )}
      {showMirrors && shownMirrors.length > 0 && (
        <Form.Dropdown
          id="mirrorStyle"
          title="Copies show"
          value={style}
          onChange={(mirrorStyle) => {
            setStyle(mirrorStyle);
            props.onChange?.({ calendarId: chosen, mirrorIds: shownMirrors, mirrorStyle });
          }}
          info="Choose how much each copy shows. Busy hides the title and the notes."
        >
          {props.allowMixed && <Form.Dropdown.Item value={MIRROR_STYLE_MIXED} title="Mixed" />}
          <Form.Dropdown.Item value={MIRROR_STYLE_DEFAULT} title="Calendar default" />
          {Object.entries(MIRROR_STYLE_LABELS).map(([value, title]) => (
            <Form.Dropdown.Item key={value} value={value} title={title} />
          ))}
        </Form.Dropdown>
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
