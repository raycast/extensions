import { Clipboard } from "@raycast/api";

export default async function Command() {
  const clipboard = (await Clipboard.readText()) || "";

  // Clean everything before the first double line break
  const match = clipboard.match(/^([\s\S]+?)\r?\n\r?\n/);
  const cleaned = match ? match[1].trim() : clipboard;

  await Clipboard.copy(cleaned);
  await Clipboard.paste(cleaned);
}
