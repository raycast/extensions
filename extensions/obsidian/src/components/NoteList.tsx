import { List, ActionPanel, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";

import fs from "fs";

import NoteLoader from "../NoteLoader";
import { Note } from "../interfaces";
import { OpenNoteActions, NoteActions } from "../actions";

export function NoteList(props: { vaultPath: string }) {
  const vaultPath = props.vaultPath;
  const [notes, setNotes] = useState<Note[]>();
  useEffect(() => {
    async function fetch() {
      try {
        await fs.promises.access(vaultPath + "/.");
        const nl = new NoteLoader(vaultPath);
        const _notes = nl.loadNotes();

        setNotes(_notes);
      } catch (error) {
        showToast(ToastStyle.Failure, "The path set in preferences does not exist.");
      }
    }
    fetch();
  }, []);

  return (
    <List isLoading={notes === undefined}>
      {notes?.map((note) => (
        <List.Item
          title={note.title}
          key={note.key}
          actions={
            <ActionPanel>
              <OpenNoteActions note={note} />
              <NoteActions note={note} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
