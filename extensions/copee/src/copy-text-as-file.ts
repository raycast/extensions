import { Clipboard, getSelectedText } from "@raycast/api";
import { handleTextToFile } from "./api/supporting";

export default async function main() {
  await handleTextToFile(getSelectedText, Clipboard.copy);
}
