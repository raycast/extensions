import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { rebaseOnSeries, type UpdateOp } from "../lib/api";
import { showApiError } from "../lib/feedback";
import type { ActivityType, Area, ScheduleEvent, SeriesReach } from "../lib/schedule-model";
import {
  homeCalendarId,
  occurrenceTarget,
  resolveActivity,
  resolveArea,
  splitOccurrenceId,
} from "../lib/schedule-model";
import { localMinutesBetween, localToDate, textLimitError, toLocalDateTime } from "../lib/format";
import { CALENDAR_NONE, CalendarFields, CalendarFormValues, calendarEditFields, useCalendars } from "./calendar-fields";

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

  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<Partial<EditFormValues>>({});
  const [calendarValues, setCalendarValues] = useState<CalendarFormValues>({});

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
    const end = values.end ? toLocalDateTime(values.end) : null;
    if (end && end !== event.end) {
      // The server stores a span of 5 minutes to 168 hours; check it before the round-trip.
      const minutes = localMinutesBetween(event.start, end) ?? 0;
      if (minutes < 5 || minutes > 168 * 60) {
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
      const cal = calendarEditFields(values, { calendarId: home, mirrorIds: knownMirrors });
      if (cal.calendarId !== undefined) patch.calendarId = cal.calendarId;
      // An unlink also removes the mirrors, and it takes no mirror field.
      if (cal.calendarId !== null && cal.mirrorCalendarIds) {
        // Keep the mirrors the picker could not show; the server accepts an id
        // that is already on the event and checks only the added ones.
        patch.mirrorCalendarIds = [...cal.mirrorCalendarIds, ...hiddenMirrors];
      }
    }

    // Nothing changed — skip the round-trip and return to the list.
    if (Object.keys(patch).length === 0) {
      pop();
      return;
    }
    const reach = recurring ? ((values.scope as SeriesReach) ?? "this") : "this";
    if (recurring) {
      // The server applies a calendar change to the whole series only.
      if ((patch.calendarId !== undefined || patch.mirrorCalendarIds) && reach !== "all") {
        await showToast({
          style: Toast.Style.Failure,
          title: "A calendar change covers the whole series",
          message: "Set “Applies to” to every block in the series, or keep the calendar as it is.",
        });
        return;
      }
    }
    const target = occurrenceTarget(event.id, reach);
    if (reach === "all" && occurrence && patch.end) {
      // A bare series id reads the end on the anchor day, so move it by the same amount.
      const rebased = await rebaseOnSeries(target.id, { ...event, date: occurrence.date }, { end: patch.end });
      if (!rebased.ok) return showApiError(rebased);
      patch.end = rebased.data.end ?? patch.end;
    }
    // An unlink may carry the other edits: the server applies them first.
    if (await onSubmit({ op: "update", ...target, ...patch })) pop();
  }

  return (
    <Form
      navigationTitle={`Edit “${event.name || "block"}”`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={event.name} />
      <Form.DatePicker
        id="end"
        title="End"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={localToDate(event.end)}
        info="Change the end to make the block longer or shorter."
      />
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
          {canPickCalendar && (
            <CalendarFields
              writable={writable}
              defaultId={defaultId}
              allowDefault={false}
              calendarDefault={calendarValues.calendarId ?? home ?? CALENDAR_NONE}
              mirrorDefault={calendarValues.mirrorIds ?? knownMirrors}
              onChange={setCalendarValues}
            />
          )}
        </>
      )}
      {recurring && (
        <Form.Dropdown id="scope" title="Applies to" defaultValue="this">
          <Form.Dropdown.Item value="this" title="This block only" />
          <Form.Dropdown.Item value="future" title="This and all later blocks" />
          <Form.Dropdown.Item value="all" title="Every block in the series" />
        </Form.Dropdown>
      )}
    </Form>
  );
}
