import { Clipboard } from "@raycast/api";
import { handleTextToFile } from "./api/helpers";

export default async function launchCommand() {
  const text = await Clipboard.readText();
  await handleTextToFile(text, Clipboard.copy);
}
