import { useEffect, useState } from "react";
import { Vault, Note } from "../utils/interfaces";
import { getRandomNote } from "../utils/utils";
import { NoteQuickLook } from "./NoteQuickLook";

export function RandomNote(props: { vault: Vault }) {
  const vault = props.vault;
  const [randomNote, setRandomNote] = useState<Note>();

  useEffect(() => {
    setRandomNote(getRandomNote(vault));
  }, []);

  return <NoteQuickLook note={randomNote} vault={vault} actionCallback={() => {}}></NoteQuickLook>;
}
