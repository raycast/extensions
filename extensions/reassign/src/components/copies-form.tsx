import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readSeries, type UpdateOp } from "../lib/api";
import { describeError } from "../lib/feedback";
import {
  homeCalendarId,
  MIRROR_STYLE_LABELS,
  occurrenceTarget,
  sameIdSet,
  splitOccurrenceId,
  type ScheduleEvent,
} from "../lib/schedule-model";
import {
  CALENDAR_NONE,
  type CalendarFormValues,
  calendarEditFields,
  calendarTitle,
  calendarIcon,
  MIRROR_STYLE_DEFAULT,
  MIRROR_STYLE_MIXED,
  mirrorStyleChoice,
  readCopySeries,
  useCalendars,
} from "./calendar-fields";

interface CopiesFormValues extends Omit<CalendarFormValues, "calendarId"> {
  scope?: string;
}

/**
 * Edit only the copies and the copy style of a read-only event (reassign#1843).
 * The op carries `mirrorCalendarIds` and `mirrorStyles` only: the server refuses
 * a new home and `scope: "future"` on a read-only event. It sends only what changed.
 */
export function CopiesForm(props: { event: ScheduleEvent; onSubmit: (op: UpdateOp) => Promise<boolean> }) {
  const { event, onSubmit } = props;
  const { pop } = useNavigation();
  const occurrence = splitOccurrenceId(event.id);
  const calendarRead = useCalendars();
  const { writable, defaultId, failed } = calendarRead;
  // A forked day shows no copy styles of its own, but its copies follow the series.
  const seriesRead = usePromise(readSeries, [occurrence?.seriesId ?? "", occurrence?.date ?? ""], {
    execute: occurrence !== null,
  });
  const series = seriesRead.data?.ok ? seriesRead.data.data : undefined;
  const isLoading = calendarRead.isLoading || seriesRead.isLoading;
  const failure = failed ? describeError(failed) : undefined;
  const home = homeCalendarId(event, defaultId);
  const choices = writable.filter((c) => c.id !== home);
  const choiceIds = new Set(choices.map((c) => c.id));
  const mirrorIds = Array.isArray(event.mirrorCalendarIds) ? event.mirrorCalendarIds : [];
  const knownMirrors = mirrorIds.filter((id) => choiceIds.has(id));
  // The picker cannot show these copies, so the op sends them back as they are.
  const hiddenMirrors = mirrorIds.filter((id) => !choiceIds.has(id));
  // The server pushes the copies of a day with the series map, so prefer it once it loads.
  const mirrorStyles = (series ? series.mirrorStyles : event.mirrorStyles) ?? {};
  const currentStyle = mirrorStyleChoice(knownMirrors, mirrorStyles);
  // Undefined until the user picks: the calendars load after the first render.
  const [picked, setPicked] = useState<string[] | undefined>(undefined);
  const [pickedStyle, setPickedStyle] = useState<string | undefined>(undefined);
  const shownMirrors = picked ?? knownMirrors;
  const style = pickedStyle ?? currentStyle;

  async function submit(submitted: CopiesFormValues) {
    // No picker: nothing to change.
    if (choices.length === 0) {
      pop();
      return;
    }
    const values: CopiesFormValues = { mirrorIds: shownMirrors, mirrorStyle: style, ...submitted };
    // Nothing touched: close before the series check, which can refuse a day with its own copies.
    if (sameIdSet(values.mirrorIds ?? [], knownMirrors) && values.mirrorStyle === currentStyle) {
      pop();
      return;
    }
    // Only "all" leaves the occurrence; the server refuses `scope: "future"` here.
    const reach = occurrence && values.scope === "all" ? "all" : "this";
    // A series-wide edit compares with the series as it is now: the first read is
    // for the display only, and the series can change while the form is open.
    let styles = mirrorStyles;
    if (occurrence && reach === "all") {
      const row = await readCopySeries(occurrence, mirrorIds);
      if (!row) return;
      styles = row.mirrorStyles ?? {};
    }
    // An untouched dropdown keeps the style that the copies have now.
    const styleChoice =
      values.mirrorStyle === currentStyle ? mirrorStyleChoice(knownMirrors, styles) : values.mirrorStyle;
    // The same home on both sides, so the result never carries a `calendarId`.
    const cal = calendarEditFields(
      { mirrorIds: values.mirrorIds, mirrorStyle: styleChoice, calendarId: home ?? CALENDAR_NONE },
      { calendarId: home, mirrorIds: knownMirrors, hiddenMirrorIds: hiddenMirrors, mirrorStyles: styles },
    );
    const patch: Pick<UpdateOp, "mirrorCalendarIds" | "mirrorStyles"> = {};
    // The server accepts an id that is already on the event and checks only the added ones.
    if (cal.mirrorCalendarIds) patch.mirrorCalendarIds = [...cal.mirrorCalendarIds, ...hiddenMirrors];
    if (cal.mirrorStyles) patch.mirrorStyles = cal.mirrorStyles;

    // The copy style belongs to the series: the server refuses `mirrorStyles` on an occurrence id.
    if (occurrence && reach === "this" && patch.mirrorStyles) {
      if (values.mirrorStyle !== undefined && values.mirrorStyle !== currentStyle) {
        await showToast({
          style: Toast.Style.Failure,
          title: "A copy style covers the whole series",
          message: "Set “Applies to” to “Every block in the series”.",
        });
        return;
      }
      // The style did not change, only the copy set: the web also drops the map here.
      delete patch.mirrorStyles;
    }

    // Nothing changed: the server refuses an occurrence op with the same copy set.
    if (Object.keys(patch).length === 0) {
      pop();
      return;
    }
    if (await onSubmit({ op: "update", id: occurrenceTarget(event.id, reach).id, ...patch })) pop();
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit Copies of “${event.name || "block"}”`}
      actions={
        <ActionPanel>
          {failed && <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={calendarRead.revalidate} />}
          <Action.SubmitForm title="Save Copies" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {!isLoading && choices.length === 0 && failure && (
        <Form.Description title={failure.title} text={failure.message ?? failed?.message ?? ""} />
      )}
      {!isLoading && choices.length === 0 && !failure && (
        <Form.Description text="Connect a calendar in Reassign. Then you can send a copy of this event to it." />
      )}
      {choices.length > 0 && (
        <Form.TagPicker
          id="mirrorIds"
          title="Mirror to"
          value={shownMirrors}
          onChange={setPicked}
          info="Also send a one-way copy to these calendars."
        >
          {choices.map((calendar) => (
            <Form.TagPicker.Item
              key={calendar.id}
              value={calendar.id}
              title={calendarTitle(calendar)}
              icon={calendarIcon(calendar)}
            />
          ))}
        </Form.TagPicker>
      )}
      {choices.length > 0 && shownMirrors.length > 0 && (
        <Form.Dropdown
          id="mirrorStyle"
          title="Copies show"
          value={style}
          onChange={setPickedStyle}
          info="Choose how much each copy shows. Busy hides the title and the notes."
        >
          {currentStyle === MIRROR_STYLE_MIXED && <Form.Dropdown.Item value={MIRROR_STYLE_MIXED} title="Mixed" />}
          <Form.Dropdown.Item value={MIRROR_STYLE_DEFAULT} title="Calendar default" />
          {Object.entries(MIRROR_STYLE_LABELS).map(([value, title]) => (
            <Form.Dropdown.Item key={value} value={value} title={title} />
          ))}
        </Form.Dropdown>
      )}
      {/* "This and all later blocks" is absent: the server refuses a split of a read-only event. */}
      {occurrence && choices.length > 0 && (
        <Form.Dropdown id="scope" title="Applies to" defaultValue="this">
          <Form.Dropdown.Item value="this" title="This block only" />
          <Form.Dropdown.Item value="all" title="Every block in the series" />
        </Form.Dropdown>
      )}
    </Form>
  );
}
