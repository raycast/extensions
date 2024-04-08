import { List, Icon, getPreferenceValues, Color } from "@raycast/api";
import { NoteItem, useNotes } from "../useNotes";
import NoteActions from "./NoteActions";
import { format } from "date-fns";

const preferences = getPreferenceValues<Preferences>();

type NoteListItemProps = {
  note: NoteItem;
  mutate: ReturnType<typeof useNotes>["mutate"];
  isDeleted?: boolean;
};

export default function NoteListItem({ note, isDeleted, mutate }: NoteListItemProps) {
  const accessories = [];

  if (preferences.shared && note.invitationLink) {
    accessories.push({
      icon: Icon.Person,
      tooltip: "Shared note",
    });
  }

  if (preferences.locked && note.locked) {
    accessories.push({
      icon: Icon.Lock,
      tooltip: "Password-protected note",
    });
  }

  if (preferences.checklist && note.checklist) {
    accessories.push({
      icon: note.checklistInProgress ? Icon.Circle : { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: note.checklistInProgress ? "Checklist in progress" : "Checklist completed",
    });
  }

  if (preferences.accounts && note.account) {
    accessories.push({
      text: preferences.folders ? `${note.account || ""} -> ${note.folder || ""}` : `${note.account || ""}`,
    });
  } else if (preferences.folders) {
    accessories.push({
      text: `${note.folder || ""}`,
      tooltip: `Folder: ${note.folder}`,
    });
  }

  if (preferences.modificationDate && note.modifiedAt) {
    accessories.push({
      date: new Date(note.modifiedAt),
      tooltip: `Last modified: ${format(note.modifiedAt, "PPp")}`,
    });
  }

  const keywords = [];
  if (note.folder) {
    keywords.push(...note.folder.split(" "));
  }

  if (note.account) {
    keywords.push(...note.account.split(" "));
  }

  if (note.snippet) {
    keywords.push(...note.snippet.split(" "));
  }

  if (note.checklist) {
    keywords.push(...["checklist", "todo", "task", "to-do"]);
    keywords.push(...(note.checklistInProgress ? ["progress", "active"] : ["done", "completed"]));
  }

  if (note.locked) {
    keywords.push(...["locked", "password", "protected"]);
  }

  if (note.invitationLink) {
    keywords.push(...["shared"]);
  }

  return (
    <List.Item
      key={note.id}
      icon={isDeleted ? { source: Icon.Trash, tintColor: Color.SecondaryText } : "notes-icon.png"}
      title={note.title || ""}
      subtitle={note.snippet}
      keywords={keywords}
      accessories={accessories}
      actions={<NoteActions note={note} isDeleted={isDeleted} mutate={mutate} />}
    />
  );
}
