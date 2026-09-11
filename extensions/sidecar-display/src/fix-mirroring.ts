// =============================================================================
// FIX MIRRORING
// Clears macOS Sidecar's own mirror mode by reconnecting the main virtual screen.
// =============================================================================

import { showHUD, showToast, Toast } from "@raycast/api";

import { reportError } from "./lib/feedback";
import { mirrorFixUnavailableMessage, mirroringFixedMessage } from "./lib/messages";
import { mirrorFixPath } from "./lib/mirrorfix";
import { reconnectVirtualScreens } from "./lib/virtualscreens";

/**
 * Clears macOS Sidecar's own mirror mode.
 *
 * NOTE: Use this when the iPad connects showing a copy of the main screen —
 *   Sidecar's own mirror mode, which the display APIs cannot see or toggle.
 *   Reconnecting the main virtual screen re-triggers the arrangement so the
 *   iPad lands extended. Requires BetterDisplay.
 */
export default async function command(): Promise<void> {
  const cliPath = await mirrorFixPath(false);
  if (cliPath === "") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot fix mirroring",
      message: mirrorFixUnavailableMessage(),
    });
    return;
  }

  try {
    await showToast({ style: Toast.Style.Animated, title: "Reconnecting virtual screens…" });
    await reconnectVirtualScreens(cliPath);
    await showHUD(mirroringFixedMessage());
  } catch (error) {
    await reportError(error, "Could not fix mirroring");
  }
}
