import { Detail, ActionPanel, useNavigation } from "@raycast/api";
import { useState } from "react";

import { Note, Vault } from "../utils/interfaces";
import { NoteActions, OpenNoteActions } from "../utils/actions";
import { isNotePinned } from "../utils/PinNoteUtils";
import { NoteAction } from "../utils/constants";
import { getNoteFileContent } from "../utils/utils";

export function NoteQuickLook(props: { note: Note; vault: Vault; actionCallback: (action: NoteAction) => void }) {
  const note = props.note;
  const vault = props.vault;
  const { pop } = useNavigation();

  const [pinned, setPinned] = useState(isNotePinned(note, vault));
  const [content, setContent] = useState(note.content);

  function reloadContent() {
    const newContent = getNoteFileContent(note.path);
    note.content = newContent;
    setContent(newContent);
  }

  function actionCallback(action: NoteAction, value: any = undefined) {
    props.actionCallback(action);
    switch (+action) {
      case NoteAction.Pin:
        setPinned(!pinned);
        break;
      case NoteAction.Delete:
        pop();
        break;
      case NoteAction.Edit:
        reloadContent();
        break;
      case NoteAction.Append:
        reloadContent();
    }
  }

  return (
    <Detail
      navigationTitle={pinned ? "⭐ " + note.title : note.title}
      markdown={content}
      actions={
        <ActionPanel>
          <OpenNoteActions note={note} vault={vault} actionCallback={actionCallback} />
          <NoteActions note={note} vault={vault} actionCallback={actionCallback} />
        </ActionPanel>
      }
    />
  );
}
