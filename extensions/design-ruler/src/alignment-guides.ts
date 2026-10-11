import { closeMainWindow, environment, getPreferenceValues, showHUD } from "@raycast/api";
import { alignmentGuides } from "swift:../swift/DesignRuler";

export default async function Command() {
  await closeMainWindow();
  const { showHintBar, remembersGuideStyle } = getPreferenceValues<Preferences.AlignmentGuides>();
  // Null once the overlay has run (it ends the process); a message if it couldn't open
  const failure = await alignmentGuides(showHintBar ?? true, remembersGuideStyle ?? false, environment.supportPath);
  if (failure) await showHUD(failure);
}
