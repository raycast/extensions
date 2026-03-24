import { getPreferenceValues } from "@raycast/api";

import { runGhosttyCommand } from "./utils/command";
import { openGhosttyTabAtFinderLocation, openGhosttyWindowAtFinderLocation } from "./utils/scripts";

export default async function Command() {
  const { openWithGhosttyMode } = getPreferenceValues<Preferences.OpenWithGhostty>();

  const script = openWithGhosttyMode === "tab" ? openGhosttyTabAtFinderLocation : openGhosttyWindowAtFinderLocation;
  await runGhosttyCommand(script);
}
