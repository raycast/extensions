import { Clipboard, showHUD } from "@raycast/api";
import removeTrackingParams from "./utils/remove-tracking-params";
import { tryCatch } from "./utils/try-catch";

export default async function Command() {
  // get raw text from clipboard
  const { data: rawText, error } = await tryCatch(Clipboard.readText());
  // if clipboard is empty, exit
  if (error || !rawText) {
    await showHUD("Failed to get clipboard text");
    return;
  }

  await removeTrackingParams(rawText);
}
