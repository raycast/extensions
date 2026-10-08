import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { inspect } from "swift:../swift/DesignRuler";

export default async function Command() {
  await closeMainWindow();
  const { showHintBar, corrections } = getPreferenceValues<Preferences.Measure>();
  // Null once the overlay has run (it ends the process); a message if it couldn't open
  const failure = await inspect(showHintBar ?? true, corrections ?? "smart");
  if (failure) await showHUD(failure);
}
