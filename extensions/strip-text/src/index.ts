import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  const { text } = await Clipboard.read();

  if (text) {
    // copy some text
    await Clipboard.copy(text.trim());
    await showHUD("Format removed!");
  } else {
    await showHUD("Latest item in clipboard does not have text");
  }
}
