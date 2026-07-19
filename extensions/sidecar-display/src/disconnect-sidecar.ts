// =============================================================================
// DISCONNECT SIDECAR
// Detaches the iPad and waits for the link to drop.
// =============================================================================

import { showHUD, showToast, Toast } from "@raycast/api";

import { reportError } from "./lib/feedback";
import { disconnectedMessage } from "./lib/messages";
import { getBackend, loadConfig } from "./lib/preferences";
import { disconnectSidecar } from "./lib/sidecar";
import { recordIntent } from "./lib/state";

/**
 * Disconnects the iPad over Sidecar.
 *
 * NOTE: Idempotent. Running it while already disconnected is a no-op.
 */
export default async function command(): Promise<void> {
  try {
    const backend = getBackend();
    const config = await loadConfig(backend);
    await showToast({ style: Toast.Style.Animated, title: `Disconnecting ${config.ipadName}…` });

    await recordIntent("disconnected");
    await disconnectSidecar(backend, config);
    await showHUD(disconnectedMessage(config.ipadName));
  } catch (error) {
    await reportError(error, "Could not disconnect Sidecar");
  }
}
