import { showFailureToast } from "@raycast/utils";
import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback, useRef, useState } from "react";
import { createEntry, formatDuration, isValidEntry, type Card, type Entry } from "daily-karte";
import { getSession } from "./auth";
import { FirestoreClient } from "./lib/firestore";
import { ErrorView, useLoad } from "./components";
import { durationInput } from "./lib/forms";
import type { Versioned, RecordAttempt } from "./lib/firestore";

export function RecordForm({
  card,
  uid,
  projectId,
  previous,
  onSaved,
}: {
  card: Card;
  uid: string;
  projectId: string;
  previous?: Versioned<Entry>;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const candidate = useRef<{ signature: string; entry: Entry; attempt: RecordAttempt } | undefined>(undefined);
  const initialEnd = useRef(new Date(previous?.record.end ?? Date.now()));
  async function submit(values: { duration: string; end: Date | null; note: string }) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      if (!values.end || values.end.getTime() > Date.now())
        throw new Error("Choose an ending time that is not in the future.");
      const duration = durationInput(values.duration);
      if (values.note.length > 500) throw new Error("Keep the note within 500 characters.");
      const signature = JSON.stringify([duration, values.end.getTime(), values.note]);
      if (candidate.current?.signature !== signature)
        candidate.current = {
          signature,
          attempt: {},
          entry: {
            ...createEntry(card, {
              end: values.end.getTime(),
              duration,
              note: values.note,
            }),
            ...(previous ? { id: previous.record.id, createdAt: previous.record.createdAt } : {}),
          },
        };
      const entry = candidate.current.entry;
      if (!isValidEntry(entry)) throw new Error("The activity is invalid and was not saved.");
      const session = await getSession();
      if (session.uid !== uid || session.config.projectId !== projectId)
        throw new Error("The account changed. Reopen Record Activity before saving.");
      const result = await new FirestoreClient(session).record(entry, previous, candidate.current.attempt);
      await showToast({
        style: Toast.Style.Success,
        title: previous ? "Activity Updated" : "Activity Recorded",
        message: `${card.name} · ${formatDuration(result.entry.duration)}${result.merged ? " · Merged with a neighboring record" : ""}`,
      });
      onSaved?.();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Activity Was Not Confirmed" });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  return (
    <Form
      navigationTitle={`${previous ? "Edit" : "Record"} ${card.name}`}
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Activity" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Activity" text={card.name} />
      <Form.TextField
        id="duration"
        title="Duration in Minutes"
        defaultValue={
          previous
            ? previous.record.duration === null
              ? ""
              : String(previous.record.duration)
            : card.duration === null
              ? ""
              : String(card.duration)
        }
        placeholder="Leave blank for no estimate"
      />
      <Form.DatePicker
        id="end"
        title="Ended At"
        defaultValue={initialEnd.current}
        type={Form.DatePicker.Type.DateTime}
      />
      <Form.TextArea
        id="note"
        defaultValue={previous?.record.note ?? ""}
        title="Note"
        placeholder="You can add a short note."
      />
    </Form>
  );
}

export function EditEntry({
  id,
  uid,
  projectId,
  onSaved,
}: {
  id: string;
  uid: string;
  projectId: string;
  onSaved: () => void;
}) {
  const loader = useCallback(async () => {
    const session = await getSession();
    if (session.uid !== uid || session.config.projectId !== projectId)
      throw new Error("The account changed. Reopen Today.");
    return new FirestoreClient(session).entrySnapshot(id);
  }, [id, uid, projectId]);
  const state = useLoad(loader);
  if (state.error) return <ErrorView error={state.error} refresh={state.refresh} />;
  if (!state.value) return <Form isLoading />;
  const entry = state.value.record;
  const card = {
    id: entry.cardId,
    name: entry.name,
    icon: entry.icon,
    color: entry.color,
    duration: entry.duration,
  };
  return <RecordForm card={card} uid={uid} projectId={projectId} previous={state.value} onSaved={onSaved} />;
}
