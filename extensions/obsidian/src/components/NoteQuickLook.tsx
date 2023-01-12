import { Detail, ActionPanel, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";

import { Note, Vault } from "../utils/interfaces";
import { NoteActions, OpenNoteActions } from "../utils/actions";
import { isNotePinned } from "../utils/pinNoteUtils";
import { NoteAction } from "../utils/constants";
import { filterContent, getNoteFileContent } from "../utils/utils";

export function NoteQuickLook(props: {
  showTitle: boolean;
  note: Note | undefined;
  notes: Note[];
  vault: Vault;
  actionCallback?: (action: NoteAction) => void;
}) {
  const { note, notes, showTitle, vault, actionCallback } = props;
  const { pop } = useNavigation();

  let noteContent = note?.content;
  noteContent = filterContent(noteContent ?? "");

  const [pinned, setPinned] = useState(note ? isNotePinned(note, vault) : false);
  const [content, setContent] = useState(noteContent);

  function reloadContent() {
    if (note) {
      const newContent = getNoteFileContent(note.path);
      note.content = newContent;
      setContent(newContent);
    }
  }

  useEffect(reloadContent, [note]);

  function quickLookActionCallback(action: NoteAction, value: any = undefined) {
    if (actionCallback) {
      actionCallback(action);
    }
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
      isLoading={note === undefined}
      navigationTitle={showTitle ? (pinned ? "⭐ " + note?.title : note?.title) : ""}
      markdown={content}
      actions={
        note ? (
          <ActionPanel>
            <OpenNoteActions note={note} notes={notes} vault={vault} actionCallback={quickLookActionCallback} />
            <NoteActions note={note} notes={notes} vault={vault} actionCallback={quickLookActionCallback} />
          </ActionPanel>
        ) : null
      }
    />
  );
}
