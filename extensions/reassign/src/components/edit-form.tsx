import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readSeries, rebaseOnSeries, type SeriesRow, type UpdateOp } from "../lib/api";
import { showApiError } from "../lib/feedback";
import type { ActivityType, Area, ScheduleEvent } from "../lib/schedule-model";
import {
  allDaySpanOf,
  homeCalendarId,
  isRecurring,
  occurrenceTarget,
  parseReach,
  resolveActivity,
  resolveArea,
  splitOccurrenceId,
} from "../lib/schedule-model";
import { localMinutesBetween, localToDate, textLimitError, toLocalDateTime } from "../lib/format";
import { MAX_SPAN_MINUTES, MIN_SPAN_MINUTES } from "../lib/wire";
import { ScopeDropdown } from "./scope-dropdown";
import {
  CALENDAR_NONE,
  CalendarFields,
  CalendarFormValues,
  calendarEditFields,
  MIRROR_STYLE_MIXED,
  mirrorStyleChoice,
  readCopySeries,
  useCalendars,
} from "./calendar-fields";

interface EditFormValues extends CalendarFormValues {
  name: string;
  end: Date | null;
  areaId: string;
  activityTypeId: string;
  notes: string;
  scope?: string;
}

/**
 * Edit a block's details with an `update` op. It changes the name, the end (so
 * the duration), the area, the activity, the notes, and the calendar home /
 * mirrors. Date and start stay in "Move to…". It sends only the changed fields.
 * An occurrence adds a scope picker. "Unassigned" / "None" clear the area / activity.
 */
export function EditForm(props: {
  event: ScheduleEvent;
  areas: Area[];
  activityTypes: ActivityType[];
  onSubmit: (op: UpdateOp) => Promise<boolean>;
}) {
  const { event, areas, activityTypes, onSubmit } = props;
  const { pop } = useNavigation();
  const occurrence = splitOccurrenceId(event.id);
  const recurring = occurrence !== null;
  const currentArea = resolveArea(event, areas);
  const currentActivity = resolveActivity(event, activityTypes);
  const currentNotes = typeof event.notes === "string" ? event.notes : "";
  const { writable, defaultId } = useCalendars();
  const writableIds = new Set(writable.map((c) => c.id));
  // A block homed in a calendar we cannot write to cannot be re-homed here.
  // A missing `calendarId` follows the default calendar; null is Reassign only.
  const home = homeCalendarId(event, defaultId);
  const canPickCalendar = !home || writableIds.has(home);
  const mirrorIds = Array.isArray(event.mirrorCalendarIds) ? event.mirrorCalendarIds : [];
  const knownMirrors = mirrorIds.filter((id) => writableIds.has(id));
  const hiddenMirrors = mirrorIds.filter((id) => !writableIds.has(id));
  // Only a one-off block keeps mirrors without a home; a series cannot.
  const mirrorsWithoutHome = home === null && !recurring && !isRecurring(event);

  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<Partial<EditFormValues>>({});
  const [calendarValues, setCalendarValues] = useState<CalendarFormValues>({});

  // A forked day shows no copy styles of its own, but the server pushes its copies
  // with the series map. Read it only when the calendar fields show.
  const seriesRead = usePromise(readSeries, [occurrence?.seriesId ?? "", occurrence?.date ?? ""], {
    execute: occurrence !== null && showDetails,
  });
  const loadedSeries = seriesRead.data?.ok ? seriesRead.data.data : undefined;
  const mirrorStyles = (loadedSeries ? loadedSeries.mirrorStyles : event.mirrorStyles) ?? {};
  // The dropdown edits only the shown mirrors; hidden ones keep their styles.
  const currentStyle = mirrorStyleChoice(knownMirrors, mirrorStyles);

  async function submit(submitted: Pick<EditFormValues, "name" | "end"> & Partial<EditFormValues>) {
    const values: EditFormValues = {
      notes: currentNotes,
      areaId: currentArea?.id ?? "",
      activityTypeId: currentActivity?.id ?? "",
      ...details,
      ...calendarValues,
      ...submitted,
    };
    const patch: Omit<UpdateOp, "op" | "id" | "scope"> = {};
    const name = values.name.trim();
    const tooLong = textLimitError(name, values.notes);
    if (tooLong) {
      await showToast({ style: Toast.Style.Failure, title: "The text is too long", message: tooLong });
      return;
    }
    if (name && name !== event.name) patch.name = name;
    if (values.end && Form.DatePicker.isFullDay(values.end)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose an end time",
        message: "Pick a date and time for the end of the block.",
      });
      return;
    }
    const end = values.end ? toLocalDateTime(values.end) : null;
    if (end && end !== event.end) {
      // The server stores a span of 5 minutes to 168 hours; check it before the round-trip.
      const minutes = localMinutesBetween(event.start, end) ?? 0;
      if (minutes < MIN_SPAN_MINUTES || minutes > MAX_SPAN_MINUTES) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Check the end time",
          message: "The end must be 5 minutes to 7 days after the start. For an overnight block, choose the next day.",
        });
        return;
      }
      patch.end = end;
    }
    // "" is the Unassigned / None choice; `null` clears the id on the server.
    if (values.areaId !== (currentArea?.id ?? "")) patch.areaId = values.areaId || null;
    if (values.activityTypeId !== (currentActivity?.id ?? "")) {
      patch.activityTypeId = values.activityTypeId || null;
    }
    if (values.notes !== currentNotes) patch.notes = values.notes;
    if (canPickCalendar) {
      const cal = calendarEditFields(values, {
        calendarId: home,
        mirrorIds: knownMirrors,
        hiddenMirrorIds: hiddenMirrors,
        mirrorStyles,
      });
      if (cal.calendarId !== undefined) patch.calendarId = cal.calendarId;
      // An unlink of the whole series also removes the mirrors, and it takes no mirror field.
      if (cal.calendarId !== null && cal.mirrorCalendarIds) {
        // Keep the mirrors the picker could not show; the server accepts an id
        // that is already on the event and checks only the added ones.
        patch.mirrorCalendarIds = [...cal.mirrorCalendarIds, ...hiddenMirrors];
      }
      if (cal.calendarId !== null && cal.mirrorStyles) patch.mirrorStyles = cal.mirrorStyles;
    }

    const reach = recurring ? parseReach(values.scope) : "this";
    // One occurrence takes a new home or copy set, but the copy styles belong
    // to the series: the server refuses `mirrorStyles` on an occurrence id.
    if (occurrence && reach === "this" && patch.mirrorStyles) {
      if (values.mirrorStyle !== undefined && values.mirrorStyle !== currentStyle) {
        await showToast({
          style: Toast.Style.Failure,
          title: "A copy style covers the whole series",
          message: "Set “Applies to” to “This and all later blocks” or “Every block in the series”.",
        });
        return;
      }
      // The style did not change, only the copy set: the web also drops the map here.
      delete patch.mirrorStyles;
    }
    // A split to Reassign only cannot keep copies: the new series has no home.
    // The server reads the series copies, which this row may not show, so always send [].
    if (occurrence && reach === "future" && patch.calendarId === null) patch.mirrorCalendarIds = [];
    // A split replaces an explicit copy set, but a style-only split inherits
    // the series copies. Check that set before replacing its style map too.
    let series: SeriesRow | undefined;
    if (
      occurrence &&
      ((reach === "all" && (patch.mirrorCalendarIds || patch.mirrorStyles)) ||
        (reach === "future" &&
          patch.mirrorStyles &&
          (patch.mirrorCalendarIds === undefined || hiddenMirrors.length > 0)))
    ) {
      const row = await readCopySeries(
        occurrence,
        reach === "future" && patch.mirrorCalendarIds !== undefined ? undefined : mirrorIds,
        loadedSeries,
      );
      if (!row) return;
      series = row;
      // A fork may omit the series styles. Keep hidden copies as the series has them.
      if (patch.mirrorStyles) {
        for (const id of hiddenMirrors) {
          delete patch.mirrorStyles[id];
          if (row.mirrorStyles?.[id]) patch.mirrorStyles[id] = row.mirrorStyles[id];
        }
      }
    }

    // Nothing changed — skip the round-trip and return to the list.
    if (Object.keys(patch).length === 0) {
      pop();
      return;
    }
    const target = occurrenceTarget(event.id, reach);
    if (reach === "all" && occurrence && patch.end) {
      // A bare series id reads the end on the anchor day, so move it by the same amount.
      const rebased = await rebaseOnSeries(
        target.id,
        { ...event, date: occurrence.date },
        { end: patch.end },
        series ?? loadedSeries,
      );
      if (!rebased.ok) return showApiError(rebased);
      patch.end = rebased.data.end ?? patch.end;
    }
    // An unlink may carry the other edits: the server applies them first.
    if (await onSubmit({ op: "update", ...target, ...patch })) pop();
  }

  return (
    <Form
      isLoading={seriesRead.isLoading}
      navigationTitle={`Edit “${event.name || "block"}”`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={event.name} />
      {/* An all-day row has the hours of one day, and the server locks them on a linked event. */}
      {!allDaySpanOf(event) && (
        <Form.DatePicker
          id="end"
          title="End"
          type={Form.DatePicker.Type.DateTime}
          defaultValue={localToDate(event.end)}
          info="Change the end to make the block longer or shorter."
        />
      )}
      <Form.Checkbox
        id="showDetails"
        label="Show area, activity, calendar, and notes"
        value={showDetails}
        onChange={setShowDetails}
      />
      {showDetails && (
        <>
          {areas.length > 0 && (
            <Form.Dropdown
              id="areaId"
              title="Area"
              value={details.areaId ?? currentArea?.id ?? ""}
              onChange={(areaId) => setDetails((current) => ({ ...current, areaId }))}
            >
              <Form.Dropdown.Item value="" title="Unassigned" />
              {areas.map((area) => (
                <Form.Dropdown.Item
                  key={area.id}
                  value={area.id}
                  title={area.name}
                  icon={{ source: Icon.Dot, tintColor: area.color }}
                />
              ))}
            </Form.Dropdown>
          )}
          {activityTypes.length > 0 && (
            <Form.Dropdown
              id="activityTypeId"
              title="Activity"
              value={details.activityTypeId ?? currentActivity?.id ?? ""}
              onChange={(activityTypeId) => setDetails((current) => ({ ...current, activityTypeId }))}
            >
              <Form.Dropdown.Item value="" title="None" />
              {activityTypes.map((type) => (
                <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} />
              ))}
            </Form.Dropdown>
          )}
          <Form.TextArea
            id="notes"
            title="Notes"
            value={details.notes ?? currentNotes}
            onChange={(notes) => setDetails((current) => ({ ...current, notes }))}
          />
          {/* The picker keeps its first value, so mount it after the calendars and the series load. */}
          {canPickCalendar && writable.length > 0 && !seriesRead.isLoading && (
            <CalendarFields
              writable={writable}
              defaultId={defaultId}
              allowDefault={false}
              calendarDefault={calendarValues.calendarId ?? home ?? CALENDAR_NONE}
              mirrorDefault={calendarValues.mirrorIds ?? knownMirrors}
              styleDefault={calendarValues.mirrorStyle ?? currentStyle}
              allowMixed={currentStyle === MIRROR_STYLE_MIXED}
              mirrorsWithoutHome={mirrorsWithoutHome}
              onChange={setCalendarValues}
            />
          )}
        </>
      )}
      {recurring && <ScopeDropdown />}
    </Form>
  );
}
