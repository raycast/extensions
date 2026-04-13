import { Clipboard, showHUD } from "@raycast/api";
import { cleanup } from "./cleanup";

export default async function Command() {
  const raw = await Clipboard.readText();
  if (!raw) {
    await showHUD("Clipboard is empty");
    return;
  }

  const cleaned = cleanup(raw);
  await Clipboard.copy(cleaned);
  await showHUD("Clipboard cleaned");
}
