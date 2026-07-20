// EntryNoteForm — pushed view for writing a private note on an entry
// from the Search Entries command.
//
// Reached via the "Add Note" / "Edit Note" action on a search result
// row. A note is personal (visible only to its author) and needs only
// read access to the entry, so this action is offered on every result,
// not just editable ones.
//
// Single Form.TextArea seeded with the entry's current note (from the
// search row's `myNote`). Submitting an empty note clears it (the
// server treats an empty body as a delete), and a dedicated "Delete
// Note" action is offered when a note already exists. After a
// successful write we call onSaved (the search command revalidates so
// the detail pane's "Your note" section updates) and pop back.

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { apiFetch, errorMessage } from "../lib/api";

interface FormValues {
  note: string;
}

export function EntryNoteForm({
  entryId,
  entryTerm,
  initialNote,
  onSaved,
}: {
  entryId: number;
  entryTerm: string;
  initialNote: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const hadNote = (initialNote ?? "").trim().length > 0;

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (input) => {
      const willClear = (input.note ?? "").trim().length === 0;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: willClear ? "Clearing note…" : "Saving note…",
      });
      try {
        await apiFetch(`/api/v1/entries/${entryId}/note`, {
          method: "PUT",
          body: JSON.stringify({ body: input.note ?? "" }),
        });
        toast.style = Toast.Style.Success;
        toast.title = willClear ? "Note cleared" : "Note saved";
        onSaved();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not save note";
        toast.message = errorMessage(error);
      }
    },
    initialValues: { note: initialNote ?? "" },
  });

  const deleteNote = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting note…",
    });
    try {
      await apiFetch(`/api/v1/entries/${entryId}/note`, { method: "DELETE" });
      toast.style = Toast.Style.Success;
      toast.title = "Note deleted";
      onSaved();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete note";
      toast.message = errorMessage(error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Note"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          {hadNote && (
            <Action
              title="Delete Note"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={deleteNote}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="Entry" text={entryTerm} />
      <Form.TextArea
        title="Your Note"
        placeholder="A private note only you can see…"
        {...itemProps.note}
      />
    </Form>
  );
}
