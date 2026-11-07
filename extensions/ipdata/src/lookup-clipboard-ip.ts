import { Clipboard } from "@raycast/api";
import { quickLookup } from "./lib/quick";

// Looks up the first IP address in the clipboard and shows the result as a HUD.
export default async function Command() {
  const text = (await Clipboard.readText()) ?? "";
  await quickLookup(text, "clipboard");
}
