import { Action, ActionPanel, Form, Toast, open, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  INBOX_ID,
  Notebook,
  createdId,
  errorCopy,
  noteArgs,
  noteLink,
  notebookChoices,
  notebookName,
} from "./capture-logic";
import { Gate, Session } from "./gate";
import { createNote, listNotebooks } from "./kanso";
import { env } from "./session";

export default function Command() {
  return <Gate>{(session) => <CaptureForm session={session} />}</Gate>;
}

function CaptureForm({ session }: { session: Session }) {
  const [books, setBooks] = useState<Notebook[]>(notebookChoices([]));
  const [error, setError] = useState<string | undefined>();

  // The notebook list is a nicety: the Inbox is always there, so a failed read
  // is left for the save to report.
  useEffect(() => {
    void listNotebooks(env, session.port, session.key)
      .then((docs) => setBooks(notebookChoices(docs)))
      .catch((e) => session.reconnect(e));
  }, [session]);

  async function submit(values: { text: string; book: string }) {
    if (values.text.trim() === "") {
      setError("Type something to capture.");
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" });
    try {
      const made = await createNote(env, session.port, session.key, noteArgs(values.text, values.book));
      const id = createdId(made);
      toast.style = Toast.Style.Success;
      toast.title = `Saved to ${notebookName(books, values.book)}`;
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
      navigationTitle="Quick Capture"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Kanso" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Note"
        placeholder="First line is the title. The rest is the note."
        error={error}
        onChange={() => setError(undefined)}
        autoFocus
      />
      <Form.Dropdown id="book" title="Notebook" defaultValue={INBOX_ID}>
        {books.map((b) => (
          <Form.Dropdown.Item key={b.id} value={b.id} title={b.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
