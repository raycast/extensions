import { List, Icon, getPreferenceValues, Color } from "@raycast/api";
import { format } from "date-fns";

import { NoteTitle } from "..";
import { NoteItem, useNotes } from "../hooks/useNotes";

import NoteActions from "./NoteActions";

const preferences = getPreferenceValues<Preferences>();

type NoteListItemProps = {
  note: NoteItem;
  noteTitles?: NoteTitle[];
  mutate: ReturnType<typeof useNotes>["mutate"];
  isDeleted?: boolean;
};

export default function NoteListItem({ note, noteTitles, isDeleted, mutate }: NoteListItemProps) {
  const accessories = [];

  if (preferences.tags && note.tags.length > 0) {
    accessories.push({
      text: `${note.tags.length}`,
      icon: Icon.Hashtag,
      // Display all tags inline and remove the leading # from the tag text
      tooltip: `${note.tags
        .map((tag) => {
          if (!tag.text) return "";
          return tag.text.slice(1);
        })
        .join(", ")}`,
    });
  }

  if (preferences.links && note.links.length > 0) {
    accessories.push({
      text: `${note.links.length}`,
      icon: Icon.Link,
      tooltip: `${note.links.length} link${note.links.length > 1 ? "s" : ""}`,
    });
  }

  if (preferences.backlinks && note.backlinks.length > 0) {
    accessories.push({
      text: `${note.backlinks.length}`,
      icon: Icon.ArrowNe,
      tooltip: `${note.backlinks.length} backlink${note.backlinks.length > 1 ? "s" : ""}`,
    });
  }

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

  if (note.tags) {
    keywords.push(...note.tags.map((tag) => tag.text?.slice(1) ?? ""));
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

  if (note.links.length > 0) {
    keywords.push("links");
  }

  if (note.backlinks.length > 0) {
    keywords.push("backlinks");
  }

  return (
    <List.Item
      key={note.id}
      icon={isDeleted ? { source: Icon.Trash, tintColor: Color.SecondaryText } : "notes-icon.png"}
      title={note.title || ""}
      subtitle={note.snippet}
      keywords={keywords}
      accessories={accessories}
      actions={<NoteActions note={note} noteTitles={noteTitles} isDeleted={isDeleted} mutate={mutate} />}
    />
  );
}
