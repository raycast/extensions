import { FormData, NoteForm } from "./note-form";
import { Entry, updateEntry } from "../api";
import { Action, showHUD } from "@raycast/api";

export function EditNote({ entry }: { entry: Entry }) {
  const onSubmit = async (data: FormData) => {
    await updateEntry(entry.id, data);
    return showHUD("Note updated");
  };
  return (
    <NoteForm
      onSubmit={onSubmit}
      initialData={{
        notes: entry.notes,
        type: entry.type,
        date: new Date(entry.datetime),
        description: entry.description,
      }}
    />
  );
}

export const EditNoteAction = ({ entry }: { entry: Entry }) => {
  return (
    <Action.Push
      shortcut={{
        key: "e",
        modifiers: ["cmd"],
      }}
      title={"Edit Note"}
      target={<EditNote entry={entry} />}
    />
  );
};
