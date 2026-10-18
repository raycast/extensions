import { Action, Icon, Keyboard } from "@raycast/api";
import { Note, noteAppUrl, noteTitle, noteUrl, Tag } from "../lib/api";
import { cmd } from "../lib/shortcuts";
import AddTaskForm from "./AddTaskForm";
import NoteTasks from "./NoteTasks";

export function NoteOpenActions(props: { note: Note; tags?: Tag[]; notes?: Note[] }) {
  const { note } = props;
  return (
    <>
      <Action.Open title="Open in Amplenote" icon={Icon.AppWindow} target={noteAppUrl(note.uuid)} />
      <Action.OpenInBrowser title="Open in Browser" url={noteUrl(note.uuid)} shortcut={Keyboard.Shortcut.Common.Open} />
      <Action.Push
        title="Show Tasks"
        icon={Icon.CheckList}
        shortcut={cmd("t")}
        target={<NoteTasks note={note} tags={props.tags} />}
      />
      <Action.Push
        title="Add Task to Note"
        icon={Icon.Plus}
        shortcut={cmd("t", { shift: true })}
        target={<AddTaskForm note={note} notes={props.notes} />}
      />
    </>
  );
}

export function NoteCopyActions(props: { note: Note }) {
  const { note } = props;
  return (
    <>
      <Action.CopyToClipboard title="Copy Note URL" content={noteUrl(note.uuid)} />
      <Action.CopyToClipboard
        title="Copy Markdown Link"
        content={`[${noteTitle(note)}](${noteUrl(note.uuid)})`}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
    </>
  );
}
