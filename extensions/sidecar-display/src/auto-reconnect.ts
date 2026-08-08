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
import {
  autoReconnectPreference,
  getBackend,
  loadConfig,
  readKeepAliveTuning,
  transportPolicy,
} from "./lib/preferences";
import { probePresence } from "./lib/reachability";
import { connectSidecar, isConnected } from "./lib/sidecar";
import { loadAutoReconnectOverride, loadKeepAliveState, recordIntent, saveKeepAliveState } from "./lib/state";
import { isTransportAllowed, presenceToReachability } from "./lib/transport";

import type { SidecarBackend } from "./lib/backend";
import type { SidecarConfig } from "./lib/sidecar";

/**
 * Brings the link up and clears Sidecar's mirror mode, reporting either.
 *
 * @param backend  - The engine.
 * @param config   - Resolved configuration.
 * @param isManual - Whether the user ran the command themselves.
 *
 * NOTE: The mirror fix gets its own try/catch because the link is already up by
 *   then — a failing fix must not skip the caller's menu-bar refresh and leave
 *   the icon reading "disconnected". And, as in connect-sidecar.ts, a reported
 *   failure is never papered over by a success HUD a moment later.
 */
async function reconnect(backend: SidecarBackend, config: SidecarConfig, isManual: boolean): Promise<void> {
  const outcome = await connectSidecar(backend, config);

  let fixed = true;
  try {
    await fixMirrorAfterFreshConnect(outcome);
  } catch (fixError) {
    fixed = false;
    if (isManual) {
      await reportError(fixError, "Reconnected, but could not fix mirroring");
    }
  }

  if (isManual && fixed) {
    await showHUD(reconnectedMessage(config.ipadName));
  }
}

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
    const found = linkUp ? null : await probePresence(config.ipadName);
    const reachability = linkUp ? "unknown" : presenceToReachability(found);
    // A manual run is an explicit "reconnect now" and ignores the transport
    // policy, exactly as it ignores the auto-reconnect switch — the preference,
    // the command description and the README all promise connecting by hand
    // always works. Without this it silently did nothing and reported
    // "Already connected" over a disconnected iPad.
    const transportAllowed = isManual || linkUp || isTransportAllowed(found, transportPolicy());

    const previous = await loadKeepAliveState();
    const decision = decideKeepAlive({
      ...readKeepAliveTuning(),
      enabled,
      isConnected: linkUp,
      nowMs: Date.now(),
      reachability,
      transportAllowed,
      wired: found?.wired === true,
      state: previous,
    });

    await saveKeepAliveState(decision.nextState);

    if (decision.notice === "nearby") {
      await showHUD(nearbyMessage(config.ipadName));
    } else if (decision.notice === "gaveUp") {
      await showHUD(gaveUpMessage(config.ipadName));
    }

    if (decision.action === "reconnect") {
      await reconnect(backend, config, isManual);
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
