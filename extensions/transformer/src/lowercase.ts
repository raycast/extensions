import { showHUD, Clipboard } from "@raycast/api";
import { resolveBasedOnPreferences } from "./utils";

export default async function main() {
  const text = await Clipboard.readText();
  if (!text) {
    showHUD("No text found in clipboard");
    return;
  }

  const transformedText = text.toString().toLowerCase();

  resolveBasedOnPreferences(transformedText);
}
