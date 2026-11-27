import { Clipboard, showHUD } from "@raycast/api";
import { run, viaRemo } from "./roku";

export default async function Command() {
  const text = await Clipboard.readText();
  if (!text) return showHUD("Clipboard is empty");
  await run(
    "Opening on TV",
    () => viaRemo(`paste/${encodeURIComponent(text)}`),
    "Couldn’t open Remo",
  );
}
