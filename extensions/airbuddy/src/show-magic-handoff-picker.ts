import { closeMainWindow, showHUD } from "@raycast/api";
import { showMagicHandoffPicker } from "./airbuddy";
import { showFailure } from "./feedback";

export default async function Command() {
  try {
    // Close Raycast FIRST — AirBuddy's picker would otherwise open behind it.
    await closeMainWindow();
    await showMagicHandoffPicker();
    // Sdef: "this does not perform a transfer automatically" — it only presents the picker. The
    // HUD confirms Raycast dispatched the command; the actual transfer is the user's next click.
    await showHUD("Magic Handoff Picker");
  } catch (error) {
    await showFailure("Couldn't show the Magic Handoff picker", error);
  }
}
