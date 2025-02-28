import { Clipboard, closeMainWindow, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { createNote } from "./api/applescript";

export default async (props: LaunchProps<{ arguments: Arguments.New }>) => {
  await closeMainWindow();

  let note = "";
  let text = "";

  try {
    text = (await Clipboard.read()).text;
  } catch {
    // fail silently
  }

  if (!text && props.fallbackText) {
    text = props.fallbackText;
  }

  if (props.arguments.note) {
    note = props.arguments.note;
  }

  try {
    await createNote(note, text);
  } catch (error) {
    showFailureToast(error, { title: "Could not create a new note." });
  }
};
