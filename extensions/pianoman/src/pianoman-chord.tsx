import { useMemo } from "react";
import { chords, getNote } from "./libs/db";
import { findNoteByName as findRootNoteByName } from "./libs/helper";
import NoteList from "./components/NoteList";
import { keySimpleList } from "./libs/key";
import { Chord } from "./libs/chord";
import ChordGrid from "./components/ChordGrid";
import { Note } from "./libs/note";
import { showToast, Toast } from "@raycast/api";

export default function Command(props: { arguments?: { rootNote: string } }) {
  const rawValue = props?.arguments?.rootNote;

  const rootNote = useMemo<Note | undefined>(() => {
    const rootNoteName = findRootNoteByName(rawValue);

    if (rootNoteName) {
      return getNote(rootNoteName);
    }
    if (rawValue) {
      showToast({
        style: Toast.Style.Failure,
        title: "No such note or chord",
        message: "Showing note listing instead",
      });
    }
  }, [rawValue]);

  const singleKeyChords = useMemo<Chord[]>(() => {
    if (!rootNote) {
      return [];
    }

    // Find chords for single key/note
    const chordDataItems = chords[rootNote.getChromaticName()] as Chord[] | undefined;
    if (chordDataItems && chordDataItems?.length > 0) {
      return chordDataItems;
    }

    console.error("Failed to find chords by", rootNote.toString());
    return [];
  }, [rootNote]);

  // Show chords from selected rootNote
  if (rootNote && singleKeyChords.length > 0) {
    return <ChordGrid rootNote={rootNote} chords={singleKeyChords} />;
  }

  // If rootNote is not selected, show listing
  return <NoteList noteNames={keySimpleList} />;
}
