import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { rebaseOnSeries, type UpdateOp } from "../lib/api";
import { showApiError } from "../lib/feedback";
import { localToDate, toLocalDateTime } from "../lib/format";
import type { ScheduleEvent } from "../lib/schedule-model";
import { occurrenceTarget, parseReach, splitOccurrenceId } from "../lib/schedule-model";
import { ScopeDropdown } from "./scope-dropdown";

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
    const reach = recurring ? parseReach(values.scope) : "this";
    // For "this" / "future" the occurrence's own start is the move reference, so
    // an unchanged start is a true no-op. For "all" the rebase re-anchors the
    // series from the occurrence's original id date, so an unchanged start can
    // still be a real re-anchor when the occurrence was moved on its own (its id
    // keeps the original date while `event.start` sits on another day or clock).
    if (start === event.start && reach !== "all") {
      pop();
      return;
    }
    const target = occurrenceTarget(event.id, reach);
    let next = start;
    if (reach === "all" && occurrence) {
      // A bare series id moves the anchor, so move it by the same amount.
      const rebased = await rebaseOnSeries(target.id, { ...event, date: occurrence.date }, { start });
      if (!rebased.ok) return showApiError(rebased);
      next = rebased.data.start ?? start;
      // The rebased start equals the anchor's current start only when the series
      // is already on this block's wall time — a true no-op; skip the write.
      if (next === rebased.data.anchorStart) {
        pop();
        return;
      }
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
      {recurring && <ScopeDropdown />}
    </Form>
  );
}
