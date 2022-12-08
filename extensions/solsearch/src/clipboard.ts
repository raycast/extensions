import { Clipboard } from "@raycast/api";

/**
 * Returns value from clipboard.
 * In case of empty clipboard - returns empty string ("")
 */
export async function getClipboardValue() {
  const clipboard = await Clipboard.readText();

  if (clipboard == undefined || clipboard.length === 0) {
    return "";
  } else {
    return clipboard as string;
  }
}
