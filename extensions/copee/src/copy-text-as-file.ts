import { Clipboard, getSelectedText } from "@raycast/api";
import { handleTextToFile } from "./api/helpers";

export default async function main() {
  await handleTextToFile(getSelectedText, Clipboard.copy);
}
