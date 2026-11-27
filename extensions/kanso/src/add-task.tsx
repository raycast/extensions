import { Action, ActionPanel, Form, Toast, open, popToRoot, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  NoteChoice,
  PREVIEW_DEBOUNCE_MS,
  When,
  errorCopy,
  noteChoices,
  noteLink,
  previewLine,
  readWhen,
  taskArgs,
  taskToast,
} from "./capture-logic";
import { Gate, Session } from "./gate";
import { addTask, listRecentNotes, parseWhen } from "./kanso";
import { env } from "./session";

export default function Command() {
  return <Gate>{(session) => <TaskForm session={session} />}</Gate>;
}

/** The form. `note` preselects one note in "Put it in" (Search Notes: Add Task Here). */
export function TaskForm({ session, note }: { session: Session; note?: NoteChoice }) {
  const [text, setText] = useState("");
  const [when, setWhen] = useState<When | undefined>();
  const [pending, setPending] = useState(false);
  const [recent, setRecent] = useState<NoteChoice[]>([]);
  const notes = note ? [note, ...recent.filter((n) => n.id !== note.id)] : recent;
  const [error, setError] = useState<string | undefined>();
  const latest = useRef(0);

  useEffect(() => {
    void listRecentNotes(env, session.port, session.key)
      .then((docs) => setRecent(noteChoices(docs)))
      .catch((e) => session.reconnect(e));
  }, [session]);

  // The live line under the field: Kanso's own parser, 150 ms after the last
  // keystroke, and only the newest answer is kept.
  useEffect(() => {
    const ticket = ++latest.current;
    if (text.trim() === "") {
      setWhen(undefined);
      setPending(false);
      return;
    }
    setPending(true);
    const timer = setTimeout(() => {
      parseWhen(env, session.port, session.key, text.trim())
        .then((result) => {
          if (ticket === latest.current) setWhen(readWhen(result));
        })
        .catch((e) => {
          if (ticket === latest.current) {
            setWhen(undefined);
            void session.reconnect(e);
          }
        })
        .finally(() => {
          if (ticket === latest.current) setPending(false);
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, session]);

  async function submit(values: { text: string; destination: string }) {
    if (values.text.trim() === "") {
      setError("Type a task.");
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding…" });
    try {
      const added = await addTask(env, session.port, session.key, taskArgs(values.text, values.destination));
      const done = taskToast(added);
      toast.style = Toast.Style.Success;
      toast.title = done.title;
      const id = done.noteId;
      if (id) toast.primaryAction = { title: "Open in Kanso", onAction: () => void open(noteLink(id)) };
      await popToRoot({ clearSearchBar: true });
    } catch (e) {
      if (await session.reconnect(e)) {
        toast.hide();
        return;
      }
      const { title, message } = errorCopy(e);
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = message;
    }
  }

  return (
    <Form
      navigationTitle="Add Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Task" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Task"
        placeholder="film Pixel review fri 3pm every week"
        value={text}
        error={error}
        onChange={(value) => {
          setText(value);
          setError(undefined);
        }}
        autoFocus
      />
      <Form.Description title="When" text={previewLine(text, when, pending)} />
      <Form.Dropdown id="destination" title="Put it in" defaultValue={note ? note.id : "daily"}>
        <Form.Dropdown.Item value="daily" title="Today's daily note" />
        <Form.Dropdown.Item value="inbox" title="Inbox task list" />
        {notes.length > 0 && (
          <Form.Dropdown.Section title="A note">
            {notes.map((n) => (
              <Form.Dropdown.Item key={n.id} value={n.id} title={n.title} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
    </Form>
  );
}
