import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import type { Scope, UpdateEventPatch } from "../lib/api";
import type { ActivityType, Area, ScheduleEvent } from "../lib/schedule-model";
import { minutesFromClock, resolveActivity, resolveArea } from "../lib/schedule-model";

interface EditFormValues {
  name: string;
  end: string;
  areaId: string;
  activityTypeId: string;
  notes: string;
  scope?: string;
}

/**
 * Edit a block's details with the `PATCH /events/{id}` op. It changes the name,
 * the end (so the duration), the area, the activity, and the notes. Date and
 * start stay in "Move to…" (the conflict-aware `move` op). It sends only the
 * changed fields. A recurring instance adds a scope picker.
 * Limit: it cannot clear an area — pick another, or clear it on the web.
 */
export function EditForm(props: {
  event: ScheduleEvent;
  areas: Area[];
  activityTypes: ActivityType[];
  onSubmit: (patch: UpdateEventPatch) => Promise<void>;
}) {
  const { event, areas, activityTypes, onSubmit } = props;
  const { pop } = useNavigation();
  const recurring = Boolean(event.isRecurringInstance);
  const currentArea = resolveArea(event, areas);
  const currentActivity = resolveActivity(event, activityTypes);
  const currentNotes = typeof event.notes === "string" ? event.notes : "";

  async function submit(values: EditFormValues) {
    const patch: UpdateEventPatch = {};
    const name = values.name.trim();
    if (name && name !== event.name) patch.name = name;
    const end = values.end.trim();
    if (end && end !== event.end) {
      // Reject a malformed end before the round-trip; the server needs HH:MM.
      if (!/^\d{1,2}:\d{2}$/.test(end)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Check the end time",
          message: "Write the time as HH:MM, for example 17:30.",
        });
        return;
      }
      patch.end = end;
      // An end at or before the start crosses midnight — mark it, or the server
      // reads the wrapped range as invalid. Send the flag either way, so moving
      // an end back to the same day also clears a previous overnight marker.
      const startMin = minutesFromClock(event.start);
      const endMin = minutesFromClock(end);
      if (startMin !== null && endMin !== null) patch.endNextDay = endMin < startMin;
    }
    if (values.areaId && values.areaId !== (currentArea?.id ?? "")) patch.areaId = values.areaId;
    if (values.activityTypeId && values.activityTypeId !== (currentActivity?.id ?? "")) {
      patch.activityTypeId = values.activityTypeId;
    }
    if (values.notes !== currentNotes) patch.notes = values.notes;

    // Nothing changed — skip the round-trip and return to the list.
    if (Object.keys(patch).length === 0) {
      pop();
      return;
    }
    if (recurring) {
      patch.scope = (values.scope as Scope) ?? "this";
      patch.occurrenceDate = event.date;
    }
    await onSubmit(patch);
    pop();
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
      <Form.TextField
        id="end"
        title="End"
        placeholder="HH:MM"
        defaultValue={event.end}
        info="Change the end time to make the block longer or shorter."
      />
      {areas.length > 0 && (
        <Form.Dropdown id="areaId" title="Area" defaultValue={currentArea?.id ?? ""}>
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
        <Form.Dropdown id="activityTypeId" title="Activity" defaultValue={currentActivity?.id ?? ""}>
          <Form.Dropdown.Item value="" title="None" />
          {activityTypes.map((type) => (
            <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea id="notes" title="Notes" defaultValue={currentNotes} />
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
