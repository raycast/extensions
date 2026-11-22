import { Clipboard, showHUD } from "@raycast/api";
import { viaRemo } from "./roku";

export default async function Command() {
  const text = await Clipboard.readText();
  if (!text) return showHUD("Clipboard is empty");
  await viaRemo(`paste/${encodeURIComponent(text)}`);
  await showHUD("Opening on TV");
}
