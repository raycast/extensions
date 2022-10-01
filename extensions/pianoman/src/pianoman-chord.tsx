import { useState, useEffect, useCallback } from "react";
import { chords, getNote } from "./libs/db";
import { findNoteByName as findRootNoteByName } from "./libs/helper";
import NoteList from "./components/NoteList";
import { keySimpleList } from "./libs/key";
import { Chord } from "./libs/chord";
import ChordGrid from "./components/ChordGrid";
import { Note } from "./libs/note";
import Loading from "./components/Loading";
import { showToast, Toast } from "@raycast/api";

export default function Command(props: { arguments: { rootNote: string } }) {
  const rawValue = props?.arguments?.rootNote;
  //const [filterText, setFilterText] = useState<string | undefined>();
  const [mounted, setMounted] = useState(false);
  const [rootNote, setRootNote] = useState<Note | undefined>();
  const [singleKeyChords, setSingleKeyChords] = useState<Chord[]>([]);

  const onRootNoteChange = useCallback((rawRootNoteName: string) => {
    const rootNoteName = findRootNoteByName(rawRootNoteName);
    if (rootNoteName) {
      setRootNote(getNote(rootNoteName));
    } else if (rawRootNoteName) {
      showToast({
        style: Toast.Style.Failure,
        title: "No such note or chord",
        message: "Showing note listing instead",
      });
    }
  }, []);

  useEffect(() => {
    onRootNoteChange(rawValue);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!rootNote) {
      return;
    }

    // Find chords for single key/note
    const chordDataItems = chords[rootNote.getChromaticName()] as Chord[] | undefined;
    if (chordDataItems && chordDataItems?.length > 0) {
      setSingleKeyChords(chordDataItems);
    } else {
      console.error("Failed to find chords by", rootNote.toString());
    }
  }, [rootNote]);

  if (!mounted) {
    return <Loading />;
  }

  // Show chords from selected rootNote
  if (rootNote && singleKeyChords.length > 0) {
    return <ChordGrid rootNote={rootNote} chords={singleKeyChords} />;
  }

  // If rootNote is not selected, show listing
  return <NoteList noteNames={keySimpleList} />;
}
