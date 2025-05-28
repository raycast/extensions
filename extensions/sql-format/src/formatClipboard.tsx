import { Clipboard } from "@raycast/api";
import { formatSQL, copyFormattedSQL } from "./utils";

/**
 * Formats the SQL text in the clipboard and copies the formatted text to the clipboard.
 * If the formatted text is empty, a toast message is shown.
 */
export default async () => {
  const output = formatSQL((await Clipboard.readText()) || "");
  if (output) {
    await copyFormattedSQL(output);
  }
};
