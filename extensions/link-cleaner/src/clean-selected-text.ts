import { getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import removeTrackingParams from "./utils/remove-tracking-params";
import { tryCatch } from "./utils/try-catch";

export default async function Command() {
  // show loading toast
  await showToast({ style: Toast.Style.Animated, title: "Getting selected text..." });

  // get raw text from selected text
  const { data: rawText, error } = await tryCatch(getSelectedText());
  // if selected text is empty, exit
  if (error) {
    await showHUD("Failed to get selected text");
    return;
  }

  await removeTrackingParams(rawText);
}
