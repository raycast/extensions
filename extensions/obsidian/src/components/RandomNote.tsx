import { useEffect, useState } from "react";
import { Vault, Note } from "../utils/interfaces";
import { getRandomNote } from "../utils/utils";
import { NoteQuickLook } from "./NoteQuickLook";

export function RandomNote(props: { vault: Vault; showTitle: boolean }) {
  const { vault, showTitle } = props;
  const [randomNote, setRandomNote] = useState<Note>();

  useEffect(() => {
    setRandomNote(getRandomNote(vault));
  }, []);

  return <NoteQuickLook note={randomNote} vault={vault} showTitle={showTitle}></NoteQuickLook>;
}
