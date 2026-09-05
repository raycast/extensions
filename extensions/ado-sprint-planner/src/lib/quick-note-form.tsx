/* eslint-disable @raycast/prefer-title-case -- action titles intentionally keep acronyms/product terms uppercase (ID, ADO, AI) */
import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { addManualTodo, splitNoteText, updateManualTodo } from "./storage";
import { ManualTodo } from "./types";

/**
 * Jot or edit ad-hoc notes for Today. Calls `onChanged` after any write so the
 * caller can revalidate its local layer.
 *
 * Add mode (no `note`): the box stays open after each add so you can capture
 * points rapidly (Enter adds and keeps open; ⌘↵ adds and closes). Text is split
 * into separate notes at each "/" that begins a new point (see splitNoteText).
 *
 * Edit mode (`note` given): pre-filled with the note's text; Save updates it in
 * place — keeping its id, position, and age — then closes. No splitting.
 */
export function QuickNoteForm({
  onChanged,
  note,
}: {
  onChanged: () => void;
  note?: ManualTodo;
}) {
  const { pop } = useNavigation();
  const isEdit = Boolean(note);
  const [text, setText] = useState(note?.text ?? "");
  const [error, setError] = useState<string | undefined>();

  async function save(values: { note: string }) {
    const raw = values.note ?? "";
    if (!raw.trim()) {
      setError("Type something first");
      return;
    }
    await updateManualTodo(note!.id, raw);
    onChanged();
    pop();
  }

  async function add(values: { note: string }, close: boolean) {
    const raw = values.note ?? "";
    const parts = splitNoteText(raw);
    if (parts.length === 0) {
      setError("Type something first");
      return;
    }
    await addManualTodo(raw);
    onChanged();
    setText("");
    setError(undefined);
    if (close) {
      pop();
      return;
    }
    await showToast({
      style: Toast.Style.Success,
      title: parts.length > 1 ? `Added ${parts.length} notes` : "Note added",
    });
  }

  return (
    <Form
      navigationTitle={isEdit ? "Edit Quick Note" : "Add Quick Note"}
      actions={
        <ActionPanel>
          {isEdit ? (
            <Action.SubmitForm
              title="Save"
              onSubmit={(v: { note: string }) => save(v)}
            />
          ) : (
            <>
              <Action.SubmitForm
                title="Add (Keep Open)"
                onSubmit={(v: { note: string }) => add(v, false)}
              />
              <Action.SubmitForm
                title="Add and Close"
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
                onSubmit={(v: { note: string }) => add(v, true)}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="note"
        title="Quick Note"
        placeholder="e.g. Follow up with Priya on the API contract"
        value={text}
        error={error}
        onChange={(v) => {
          setText(v);
          if (error) setError(undefined);
        }}
      />
      {!isEdit && (
        <Form.Description text="Start a new line with / to split it into its own note (e.g. -a  -b  /c → a note “-a  -b” plus a note “c”). Dashes and numbers stay together in one note." />
      )}
    </Form>
  );
}
