import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef, useState } from "react";
import { MAX_SESSION_MINUTES } from "./log.ts";
import { store } from "./runtime.ts";
import { UNLABELLED } from "./stats.ts";
import { MAX_NOTES, type SaveResult } from "./store.ts";
import type { Session } from "./types.ts";

type Props = {
  session?: Session;
  goals: string[];
  onDone: () => void;
};

const REFUSED = {
  collision: { title: "Could Not Save Session", message: "A session already starts at this time." },
  missing: { title: "Session Deleted", message: "This session no longer exists." },
};

export function SessionForm({ session, goals, onDone }: Props) {
  const { pop } = useNavigation();
  const [goal, setGoal] = useState(session?.goal ?? goals[0] ?? "");
  const [start, setStart] = useState<Date | null>(session ? new Date(session.start) : new Date());
  const [minutes, setMinutes] = useState(session ? String(session.duration) : "25");
  const [notes, setNotes] = useState(session?.notes ?? "");
  const inFlight = useRef(false);

  const duration = Number.parseInt(minutes, 10);
  const minutesError =
    !Number.isFinite(duration) || duration < 1 || duration > MAX_SESSION_MINUTES
      ? `Between 1 and ${MAX_SESSION_MINUTES}`
      : undefined;
  const startError = !start ? "Required" : start.getTime() > Date.now() ? "Must be in the past" : undefined;
  const notesError = notes.trim().length > MAX_NOTES ? `Up to ${MAX_NOTES} characters` : undefined;

  async function submit() {
    if (minutesError || startError || notesError || !start || inFlight.current) return;
    inFlight.current = true;

    const next: Session = {
      start: start.getTime(),
      goal: goal.trim(),
      duration,
      source: "manual",
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    let result: SaveResult;
    try {
      result = await store.saveSession({ previousStart: session?.start, session: next });
    } catch (error) {
      inFlight.current = false;
      await showFailureToast(error, { title: "Could Not Save Session" });
      return;
    }

    if (!result.ok) {
      inFlight.current = false;
      await showToast({ style: Toast.Style.Failure, ...REFUSED[result.reason] });
      return;
    }
    await showToast({ style: Toast.Style.Success, title: session ? "Session Updated" : "Session Added" });
    onDone();
    pop();
  }

  return (
    <Form
      navigationTitle={session ? "Edit Session" : "Add Session"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={session ? "Save Session" : "Add Session"}
            icon={session ? Icon.Check : Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="goal"
        title="Goal"
        placeholder={UNLABELLED}
        value={goal}
        onChange={setGoal}
        info={goals.length ? `Used before: ${goals.join(", ")}` : undefined}
      />
      <Form.DatePicker
        id="start"
        title="Started"
        type={Form.DatePicker.Type.DateTime}
        value={start}
        onChange={setStart}
        error={startError}
      />
      <Form.TextField id="minutes" title="Minutes" value={minutes} onChange={setMinutes} error={minutesError} />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="What happened in this session?"
        value={notes}
        onChange={setNotes}
        error={notesError}
      />
    </Form>
  );
}
