import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import type { Scope, WriteOp } from "../lib/api";
import { clockHM, combineDateTime, todayISO } from "../lib/format";
import type { ScheduleEvent } from "../lib/schedule-model";

type MoveOp = Extract<WriteOp, { op: "move" }>;

interface MoveFormValues {
  start: Date | null; // new date + time in one field
  scope?: string;
}

/**
 * Move a block to a new date and start time (one date+time field). `move` is the
 * only time op the API exposes; name, area, and duration edits use Edit Details.
 * A recurring instance adds a scope picker (this / future / all).
 */
export function MoveForm(props: { event: ScheduleEvent; onMove: (op: MoveOp) => Promise<void> }) {
  const { event, onMove } = props;
  const { pop } = useNavigation();
  const recurring = Boolean(event.isRecurringInstance);

  async function submit(values: MoveFormValues) {
    // No new time picked — nothing to move.
    if (!values.start) {
      pop();
      return;
    }
    const nextDate = todayISO(values.start);
    const nextStart = clockHM(values.start);
    const op: MoveOp = { op: "move", id: event.id };
    if (nextDate !== event.date) op.date = nextDate;
    if (nextStart !== event.start) op.start = nextStart;

    // Nothing changed — skip the round-trip and return to the list.
    if (op.date === undefined && op.start === undefined) {
      pop();
      return;
    }
    if (recurring) {
      op.scope = (values.scope as Scope) ?? "this";
      op.occurrenceDate = event.date;
    }
    await onMove(op);
    pop();
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
        defaultValue={combineDateTime(event.date, event.start)}
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
