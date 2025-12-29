import { Clipboard } from "@raycast/api";

export async function setClipboard(text: string) {
  await Clipboard.copy(text);
}
