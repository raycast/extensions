import { closeMainWindow, getApplications, open, showHUD } from "@raycast/api";
import { Place } from "./data";

const BUNDLE_ID = "io.github.houseofmackee.forkz";

/**
 * Opens a forkz:// link, for example `forkz://connect?site=Staging`, after
 * checking that forkz is installed. Failures are shown in a HUD, never left
 * uncaught. See forkz's README ("Shortcuts and forkz:// links") for every
 * link.
 */
export async function openLink(action: string, parameters: Record<string, string> = {}) {
  try {
    const installed = await getApplications();
    if (!installed.some((app) => app.bundleId === BUNDLE_ID)) {
      await showHUD("forkz is not installed");
      return;
    }
    // Spaces as %20, not "+": forkz reads the values as percent-encoded.
    const query = Object.entries(parameters)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");
    await closeMainWindow();
    await open(`forkz://${action}${query ? `?${query}` : ""}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await showHUD(`Could not open forkz: ${reason}`);
  }
}

/** Opens a folder in forkz: on the Mac, or on its site. */
export async function openPlace(place: Place) {
  if (place.site) {
    await openLink("connect", { site: place.site.name, path: place.path });
  } else {
    await openLink("open", { path: place.path });
  }
}
