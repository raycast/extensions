import { PopToRootType, closeMainWindow } from "@raycast/api";
import { useState } from "react";
import { Editor } from "./components/editor";
import { notesRoot } from "./lib/prefs";

/**
 * A root command so a hotkey can open a blank note directly; reaching the same
 * editor through the notes list would cost an extra step.
 */
export default function NewNote() {
  const [root] = useState(notesRoot);
  // Popping to root discards the form: closing the window alone leaves the view
  // alive, so the next launch would reopen on the note just saved.
  return (
    <Editor
      root={root}
      onClose={() => closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate })}
    />
  );
}
