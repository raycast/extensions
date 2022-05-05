import { showToast, Toast, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";

import NoteLoader from "../utils/NoteLoader";
import { Note } from "../utils/interfaces";
import { NoteList } from "./NoteList";
import { unpinNote } from "../utils/PinNoteUtils";

export function NoteListObsidian(props: { vaultPath: string }) {
  function unpinNoteAction(note: Note) {
    return (
      <Action
        title="Unpin Note"
        shortcut={{ modifiers: ["opt", "cmd"], key: "u" }}
        onAction={() => {
          const pinnedNotes = unpinNote(note, props.vaultPath);
        }}
        icon={Icon.XmarkCircle}
      />
    );
  }

  const vaultPath = props.vaultPath;
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    async function fetch() {
      try {
        await fs.promises.access(vaultPath + "/.");
        const nl = new NoteLoader(vaultPath);
        const _notes = nl.loadNotes();

        setNotes(_notes);
      } catch (error) {
        showToast({
          title: "The path set in preferences doesn't exist",
          message: "Please set a valid path in preferences",
          style: Toast.Style.Failure,
        });
      }
    }
    fetch();
  }, []);

  return <NoteList notes={notes} vaultPath={props.vaultPath} action={unpinNoteAction} />;
}
