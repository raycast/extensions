import { closeMainWindow, getSelectedText, LaunchProps, showToast, Toast } from "@raycast/api";
import { createNote } from "./api";

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
    showToast({ style: Toast.Style.Failure, title: "Could not create a new note." });
  }
};
