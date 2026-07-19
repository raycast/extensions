// =============================================================================
// CONNECT SIDECAR
// Attaches the iPad and settles it into the configured display mode.
// =============================================================================

import { showHUD, showToast, Toast } from "@raycast/api";

import { reportError } from "./lib/feedback";
import { describeOutcome } from "./lib/messages";
import { fixMirrorAfterFreshConnect } from "./lib/mirrorfix";
import { getBackend, loadConfig } from "./lib/preferences";
import { connectSidecar } from "./lib/sidecar";
import { recordIntent } from "./lib/state";

/**
 * Connects the iPad over Sidecar, then forces extend or mirror.
 *
 * NOTE: Idempotent. Running it while already connected simply re-asserts mode.
 *   When "fix mirroring" is enabled, the mirror fix runs afterwards on a fresh
 *   connect to clear macOS Sidecar's own mirror mode.
 */
export default async function command(): Promise<void> {
  try {
    const backend = getBackend();
    const config = await loadConfig(backend);
    await showToast({ style: Toast.Style.Animated, title: `Connecting ${config.ipadName}…` });

    // Record intent before the attempt so a connect that then fails is still
    // treated as "wanted" by auto-reconnect, matching disconnect and the menu.
    await recordIntent("connected");
    const outcome = await connectSidecar(backend, config);

    // The connect already succeeded here, so a failing fix is reported on its
    // own rather than as a connect failure.
    try {
      await fixMirrorAfterFreshConnect(outcome);
    } catch (fixError) {
      await reportError(fixError, "Connected, but could not fix mirroring");
      return;
    }

    await showHUD(describeOutcome(config, outcome));
  } catch (error) {
    await reportError(error, "Could not connect Sidecar");
  }
}
