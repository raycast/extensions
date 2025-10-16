import { getSelectedText } from "@raycast/api";
import { formatSQL, copyFormattedSQL } from "./utils";

/**
 * Formats the selected text and copies the formatted text to the clipboard.
 */
export default async () => {
  const output = formatSQL(await getSelectedText());
  if (output) {
    await copyFormattedSQL(output);
  }
};
