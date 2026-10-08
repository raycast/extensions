import { closeMainWindow, environment, getPreferenceValues, showHUD } from "@raycast/api";
import { alignmentGuides } from "swift:../swift/DesignRuler";

interface Preferences {
  showHintBar: boolean;
  remembersGuideStyle: boolean;
}

export default async function Command() {
  await closeMainWindow();
  const { showHintBar, remembersGuideStyle } = getPreferenceValues<Preferences>();
  // Null once the overlay has run (it ends the process); a message if it couldn't open
  const failure = await alignmentGuides(showHintBar ?? true, remembersGuideStyle ?? false, environment.supportPath);
  if (failure) await showHUD(failure);
}
