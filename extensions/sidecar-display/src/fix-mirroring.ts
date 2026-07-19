// =============================================================================
// FIX MIRRORING
// Clears macOS Sidecar's own mirror mode by reconnecting the main virtual screen.
// =============================================================================

import { showHUD, showToast, Toast } from "@raycast/api";

import { reportError } from "./lib/feedback";
import { mirroringFixedMessage } from "./lib/messages";
import { betterDisplayAvailable, getBetterDisplayCliPath } from "./lib/preferences";
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
  if (!betterDisplayAvailable()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "BetterDisplay required",
      message: "This fix needs BetterDisplay and betterdisplaycli installed.",
    });
    return;
  }

  try {
    await showToast({ style: Toast.Style.Animated, title: "Fixing mirroring…" });
    await reconnectVirtualScreens(getBetterDisplayCliPath());
    await showHUD(mirroringFixedMessage());
  } catch (error) {
    await reportError(error, "Could not fix mirroring");
  }
}
