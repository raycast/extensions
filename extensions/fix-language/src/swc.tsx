import { Clipboard } from "@raycast/api";
import { switchLanguage } from "./common";

export default async function Command() {
  const clipboardContent = await Clipboard.read();
  if (clipboardContent.text.length > 1) {
    const mappedText = switchLanguage(clipboardContent.text);
    Clipboard.copy(mappedText);
  }
}
