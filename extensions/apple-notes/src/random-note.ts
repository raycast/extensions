import { open, closeMainWindow, LaunchProps, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { getNotes } from "./api/getNotes";
import { getOpenNoteURL } from "./helpers";

export default async (props: LaunchProps<{ arguments: Arguments.RandomNote }>) => {
  await closeMainWindow();

  try {
    const tags = props.arguments.tags?.trim() ? props.arguments.tags.split(/\s+/) : [];

    const { maxQueryResults } = getPreferenceValues();
    const max = parseInt(maxQueryResults, 10) || 250;

    const notes = await getNotes(max, tags);

    if (notes.length === 0) {
      await showFailureToast(null, {
        title: tags.length ? "No notes found with specified tags" : "No notes found",
      });
      return;
    }

    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    await open(getOpenNoteURL(randomNote.UUID));
  } catch (error) {
    await showFailureToast(error, { title: "Could not open a random note." });
  }
};
