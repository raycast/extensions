import { closeMainWindow, getSelectedText, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { createNote } from "./api/applescript";

export default async (props: LaunchProps<{ arguments: Arguments.New }>) => {
  await closeMainWindow();

  let text = "";
  try {
    text = await getSelectedText();
  } catch {
    // fails silently
  }

  if (props.fallbackText) {
    text = props.fallbackText;
  }

  if (props.arguments.text) {
    text = props.arguments.text;
  }

  try {
    await createNote(text.trim());
  } catch (error) {
    showFailureToast(error, { title: "Could not create a new note." });
  }
};
