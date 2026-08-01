// =============================================================================
// AUTO-RECONNECT (BACKGROUND)
// Restores a Sidecar link that dropped on its own, with backoff.
// -----------------------------------------------------------------------------
// Context: Raycast runs this on a background interval (enable it in the command
//   settings). There is no on-wake event, so "reconnect after sleep" happens on
//   the next scheduled tick, within roughly one interval.
// WARN: Reconnects only when auto-reconnect is enabled, the user wants the iPad
//   connected, and the link dropped by itself. A deliberate disconnect is never
//   chased. It never writes the main display. A manual run overrides the enable
//   switch (reconnect now). All timing is configurable; see readKeepAliveTuning.
// =============================================================================

import { environment, LaunchType, showHUD } from "@raycast/api";

import { refreshMenuBar, reportError } from "./lib/feedback";
import { decideKeepAlive, keepAliveEnabled, shouldRefreshMenuBar } from "./lib/keepalive";
import { alreadyConnectedMessage, gaveUpMessage, nearbyMessage, reconnectedMessage } from "./lib/messages";
import { fixMirrorAfterFreshConnect } from "./lib/mirrorfix";
import { autoReconnectPreference, getBackend, loadConfig, readKeepAliveTuning } from "./lib/preferences";
import { probeReachability } from "./lib/reachability";
import { connectSidecar, isConnected } from "./lib/sidecar";
import { loadAutoReconnectOverride, loadKeepAliveState, recordIntent, saveKeepAliveState } from "./lib/state";

/**
 * One keep-alive tick: reconnect if the link dropped on its own.
 *
 * NOTE: When run by hand (UserInitiated) it re-arms the intent to "connected"
 *   first, so invoking it acts as a "reconnect now" and restarts the fast phase.
 *   On a background tick it only acts on the persisted intent.
 */
export default async function command(): Promise<void> {
  try {
    const isManual = environment.launchType === LaunchType.UserInitiated;
    if (isManual) {
      await recordIntent("connected");
    }

    const backend = getBackend();
    const config = await loadConfig(backend);
    const linkUp = await isConnected(backend, config);

    const enabled = keepAliveEnabled(isManual, await loadAutoReconnectOverride(), autoReconnectPreference());

    // Probed whenever the link is down — including with auto-reconnect off, since
    // that is exactly when a "your iPad is back" HUD carries information. There is
    // nothing to ask when the iPad is already attached.
    const reachability = linkUp ? "unknown" : await probeReachability(config.ipadName);

    const previous = await loadKeepAliveState();
    const decision = decideKeepAlive({
      ...readKeepAliveTuning(),
      enabled,
      isConnected: linkUp,
      nowMs: Date.now(),
      reachability,
      state: previous,
    });

    await saveKeepAliveState(decision.nextState);

    if (decision.notice === "nearby") {
      await showHUD(nearbyMessage(config.ipadName));
    } else if (decision.notice === "gaveUp") {
      await showHUD(gaveUpMessage(config.ipadName));
    }

    if (decision.action === "reconnect") {
      const outcome = await connectSidecar(backend, config);
      // A background reconnect brings the link up in Sidecar's mirror mode just
      // like a manual connect, so clear it here too — otherwise waking the Mac
      // leaves the iPad mirroring until the next manual Fix Mirroring.
      await fixMirrorAfterFreshConnect(outcome);
      if (isManual) {
        await showHUD(reconnectedMessage(config.ipadName));
      }
    } else if (isManual) {
      // A manual run decides "none" only when the link is already up (the intent
      // was just re-armed), so acknowledge rather than doing nothing silently.
      await showHUD(alreadyConnectedMessage(config.ipadName));
    }

    // Last, so the menu bar re-renders against the post-reconnect reality rather
    // than the state this tick started from.
    if (shouldRefreshMenuBar(previous, decision)) {
      await refreshMenuBar();
    }
  } catch (error) {
    // A failed background attempt is expected when the iPad is genuinely gone;
    // only surface it when the user ran the command themselves.
    if (environment.launchType === LaunchType.UserInitiated) {
      await reportError(error, "Could not reconnect Sidecar");
    }
  }
}
