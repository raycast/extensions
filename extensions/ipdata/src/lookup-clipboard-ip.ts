import { Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { quickLookup } from "./lib/quick";

// Looks up the first IP address in the clipboard and shows the result as a HUD.
export default async function Command() {
  try {
    const text = (await Clipboard.readText()) ?? "";
    await quickLookup(text, "clipboard");
  } catch (error) {
    await showFailureToast(error, { title: "Could not look up the clipboard IP" });
  }
}
