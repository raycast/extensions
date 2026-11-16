import { LaunchType, getSelectedText, launchCommand, showHUD } from "@raycast/api";
import { log } from "./core/log";

// Highlighted text opens the results. With nothing highlighted, the results screen reads the
// clipboard instead (text, or a copied image such as a business-card photo).
export default async function Command() {
  let text = "";
  try {
    text = await getSelectedText();
    log("selection", `selected text: ${text.length} chars`);
  } catch (err) {
    log("selection", "no selection, using the clipboard", err);
  }
  try {
    await launchCommand({
      name: "save-vcard",
      type: LaunchType.UserInitiated,
      context: text.trim() ? { text, source: "selection" } : { source: "clipboard" },
    });
  } catch (err) {
    log("selection", "could not open the results", err);
    await showHUD(`Could not open Save vCard: ${String(err).slice(0, 80)}`);
  }
}
