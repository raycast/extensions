import { listNotes, Note, NoteEntry, readNote } from "./note-utilities";
import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import Style = Toast.Style;

export const useNote = ({ entry }: { entry: NoteEntry }) => {
  const [note, setNote] = useState<Note>();

  useEffect(() => {
    try {
      const result = readNote({ entry });
      setNote(result);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code == "ENOENT") {
        setNote({
          entry,
          content: "",
        });
      } else {
        void showToast({ style: Style.Failure, title: "Failed to load note", message: (error as Error).message });
        console.error(error);
      }
    }
  }, [entry]);

  return [note];
};

export const useNoteList = () => {
  const [notes, setNotes] = useState<NoteEntry[]>([]);

  useEffect(() => {
    try {
      const result = listNotes().reverse();
      setNotes(result);
    } catch (error: unknown) {
      void showToast({ style: Style.Failure, title: "Failed to load notes", message: (error as Error).message });
      console.error(error);
    }
  }, []);

  return [notes];
};
