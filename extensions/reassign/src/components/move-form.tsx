import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { rebaseOnSeries, type UpdateOp } from "../lib/api";
import { showApiError } from "../lib/feedback";
import { localToDate, toLocalDateTime } from "../lib/format";
import type { ScheduleEvent, SeriesReach } from "../lib/schedule-model";
import { occurrenceTarget, splitOccurrenceId } from "../lib/schedule-model";

interface MoveFormValues {
  start: Date | null; // new date + time in one field
  scope?: string;
}

/**
 * Move a block to a new date and start time (one date+time field) with an
 * `update` op. A lone `start` keeps the duration. Name, area, and end edits use Edit
 * Details. An occurrence adds a scope picker (this / future / all).
 */
export function MoveForm(props: { event: ScheduleEvent; onMove: (op: UpdateOp) => Promise<boolean> }) {
  const { event, onMove } = props;
  const { pop } = useNavigation();
  const occurrence = splitOccurrenceId(event.id);
  const recurring = occurrence !== null;

  async function submit(values: MoveFormValues) {
    // No new time picked — nothing to move.
    if (!values.start) {
      pop();
      return;
    }
    const start = toLocalDateTime(values.start);
    // Nothing changed — skip the round-trip and return to the list.
    if (start === event.start) {
      pop();
      return;
    }
    const reach = recurring ? ((values.scope as SeriesReach) ?? "this") : "this";
    const target = occurrenceTarget(event.id, reach);
    let next = start;
    if (reach === "all" && occurrence) {
      // A bare series id moves the anchor, so move it by the same amount.
      const rebased = await rebaseOnSeries(target.id, { ...event, date: occurrence.date }, { start });
      if (!rebased.ok) return showApiError(rebased);
      next = rebased.data.start ?? start;
    }
    if (await onMove({ op: "update", ...target, start: next })) pop();
  }

  return (
    <Form
      navigationTitle={`Move “${event.name || "block"}”`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Move Block" icon={Icon.Clock} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Block" text={event.name || "(untitled)"} />
      <Form.DatePicker
        id="start"
        title="New start"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={localToDate(event.start)}
      />
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
