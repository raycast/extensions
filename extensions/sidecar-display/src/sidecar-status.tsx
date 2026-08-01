// =============================================================================
// SIDECAR STATUS (MENU BAR)
// Live menu-bar item: device name, connection state, and one-click actions.
// -----------------------------------------------------------------------------
// Context: Rendered by Raycast on its background interval and whenever an action
//   re-runs the command. Shows every paired Sidecar device, marks the connected
//   one, and lets you connect, disconnect, or switch extend/mirror.
// WARN: Connect/disconnect/extend/mirror go through the same guarded
//   orchestration as the commands — the main display is never written. Only the
//   explicit Fix Mirroring action cycles a display (the main virtual screen).
// =============================================================================

import { Color, getPreferenceValues, Icon, MenuBarExtra, openExtensionPreferences, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

import { refreshMenuBar, reportError } from "./lib/feedback";
import { effectiveAutoReconnect } from "./lib/keepalive";
import {
  autoReconnectLabel,
  autoReconnectMessage,
  connectedMessage,
  describeModeSwitch,
  disconnectedMessage,
  mirroringFixedMessage,
  presenceTooltip,
} from "./lib/messages";
import { fixMirrorAfterFreshConnect } from "./lib/mirrorfix";
import {
  autoReconnectPreference,
  betterDisplayAvailable,
  buildConfig,
  getBackend,
  getBetterDisplayCliPath,
} from "./lib/preferences";
import { probeReachability } from "./lib/reachability";
import { connectSidecar, disconnectSidecar, ensureDisplayMode, isConnected } from "./lib/sidecar";
import {
  loadAutoReconnectOverride,
  loadSelectedDevice,
  recordIntent,
  saveAutoReconnectOverride,
  saveSelectedDevice,
} from "./lib/state";
import { reconnectVirtualScreens } from "./lib/virtualscreens";

import type { DisplayMode, SidecarDevice } from "./lib/backend";

/** Everything the menu needs to render one refresh. */
interface StatusModel {
  readonly devices: readonly SidecarDevice[];
  readonly selected: string;
  readonly connected: boolean;
  readonly canReconnectVirtual: boolean;
  readonly autoReconnectOn: boolean;
  /** Presence while disconnected; null when the probe could not answer. */
  readonly nearby: boolean | null;
}

/** What the menu falls back to when the status read fails outright. */
const EMPTY_MODEL: StatusModel = {
  devices: [],
  selected: "",
  connected: false,
  nearby: null,
  canReconnectVirtual: false,
  autoReconnectOn: false,
};

/**
 * Gathers the current Sidecar picture for the menu.
 *
 * @returns Paired devices, the selected device, whether it is connected, whether
 *   the iPad is nearby when it is not, whether the virtual-screen reconnect is
 *   available (BetterDisplay present), and the effective auto-reconnect state.
 *
 * NOTE: The presence probe runs only while disconnected — a live link already
 *   proves the iPad is there. It is a silent read, so it costs no error banner.
 */
async function loadStatus(): Promise<StatusModel> {
  const backend = getBackend();
  const devices = await backend.listDevices();
  const pinned = await loadSelectedDevice();
  const selected = pinned !== "" ? pinned : (devices[0]?.name ?? "");
  // An out-of-range iPad is absent from the device list entirely, and a device
  // that is not listed cannot be connected — so an empty list answers the
  // connection question for free, skipping the second CLI call. This is the
  // common all-day case, and it is derived from the list rather than from the
  // undocumented presence bit, so nothing here trusts that bit.
  const connectable = selected !== "" && devices.length > 0;
  const connected = connectable && (await isConnected(backend, buildConfig(selected)));
  const autoReconnectOn = effectiveAutoReconnect(await loadAutoReconnectOverride(), autoReconnectPreference());
  const nearby = connected || selected === "" ? null : await probeNearby(selected);
  return { devices, selected, connected, nearby, canReconnectVirtual: betterDisplayAvailable(), autoReconnectOn };
}

/**
 * Resolves the presence probe into a tri-state for the menu.
 *
 * @param name - The Sidecar device to probe.
 * @returns True/false when the probe answers, null when it cannot — so an
 *   unavailable probe reads as "unknown" rather than as "away".
 */
async function probeNearby(name: string): Promise<boolean | null> {
  const reading = await probeReachability(name);
  return reading === "unknown" ? null : reading === "reachable";
}

/**
 * Connects the given device, pinning it as the selection.
 *
 * @param name - Device to connect.
 */
async function connectDevice(name: string): Promise<void> {
  await saveSelectedDevice(name);
  await recordIntent("connected");
  const outcome = await connectSidecar(getBackend(), buildConfig(name));
  await fixMirrorAfterFreshConnect(outcome);
}

/**
 * Disconnects the given device.
 *
 * @param name - Device to disconnect.
 */
async function disconnectDevice(name: string): Promise<void> {
  await recordIntent("disconnected");
  await disconnectSidecar(getBackend(), buildConfig(name));
}

/**
 * Switches the connected iPad between extend and mirror.
 *
 * @param name - Device to reconfigure.
 * @param mode - Desired display mode.
 * @returns The HUD line describing what actually happened (settled, safely
 *   skipped, or unsettled) — never a blanket success.
 */
async function setMode(name: string, mode: DisplayMode): Promise<string> {
  const config = buildConfig(name, { mode });
  const outcome = await ensureDisplayMode(getBackend(), config);
  return describeModeSwitch(config, outcome);
}

/**
 * Flips the auto-reconnect override and reports the new state.
 *
 * @param currentlyOn - The state shown in the menu when it was clicked.
 * @returns The HUD line for the new state.
 *
 * NOTE: Writes an override that takes precedence over the preference from here
 *   on (see effectiveAutoReconnect), so the menu is a one-click switch.
 */
async function toggleAutoReconnect(currentlyOn: boolean): Promise<string> {
  const next = !currentlyOn;
  await saveAutoReconnectOverride(next);
  return autoReconnectMessage(next);
}

/**
 * Runs a menu action, surfacing success as a HUD and failure as a toast.
 *
 * @param action     - The async work to perform; a returned string is shown as
 *   the HUD verbatim, so an action can report a safe-skip or unsettled result.
 * @param errorTitle - Toast headline shown when the action throws.
 * @param successHUD - HUD for actions that return void; omit when the action
 *   always supplies its own message.
 *
 * NOTE: Menu-bar actions have no ambient error surface, so without this a failed
 *   click would be silent and leak an unhandled rejection. This mirrors the
 *   try/catch + feedback every command entry point uses.
 * NOTE: Re-runs this command afterwards. Every action here changes something the
 *   menu displays, and a menu-bar command renders only when it runs — without the
 *   nudge the item would still be showing the pre-click state next time it is
 *   opened. Also runs after a failure, since a half-applied action still moves it.
 */
async function runAction(action: () => Promise<string | void>, errorTitle: string, successHUD?: string): Promise<void> {
  try {
    const message = await action();
    if (typeof message === "string") {
      await showHUD(message);
    } else if (successHUD !== undefined) {
      await showHUD(successHUD);
    }
  } catch (error) {
    await reportError(error, errorTitle);
  } finally {
    await refreshMenuBar();
  }
}

// -----------------------------------------------------------
// SECTIONS
// -----------------------------------------------------------

/**
 * The actions for the selected device: extend/mirror/disconnect, or connect.
 *
 * @param props.selected  - The device the actions act on.
 * @param props.connected - Whether that device is currently attached.
 * @param props.nearby    - Presence while disconnected; null when unknown.
 * @returns The device section.
 */
function DeviceSection({
  selected,
  connected,
  nearby,
}: {
  selected: string;
  connected: boolean;
  nearby: boolean | null;
}): React.JSX.Element {
  return (
    <MenuBarExtra.Section title={presenceTooltip(selected, connected, nearby)}>
      {connected ? (
        <>
          <MenuBarExtra.Item
            title="Extend"
            icon={Icon.AppWindowGrid2x2}
            onAction={() => runAction(() => setMode(selected, "extend"), `Could not extend ${selected}`)}
          />
          <MenuBarExtra.Item
            title="Mirror"
            icon={Icon.Duplicate}
            onAction={() => runAction(() => setMode(selected, "mirror"), `Could not mirror ${selected}`)}
          />
          <MenuBarExtra.Item
            title="Disconnect"
            icon={Icon.MinusCircle}
            onAction={() =>
              runAction(
                () => disconnectDevice(selected),
                `Could not disconnect ${selected}`,
                disconnectedMessage(selected),
              )
            }
          />
        </>
      ) : (
        <MenuBarExtra.Item
          title="Connect"
          icon={Icon.Monitor}
          onAction={() =>
            runAction(() => connectDevice(selected), `Could not connect ${selected}`, connectedMessage(selected))
          }
        />
      )}
    </MenuBarExtra.Section>
  );
}

/**
 * The device picker, shown only when more than one device is paired.
 *
 * @param props.devices  - Every paired Sidecar device.
 * @param props.selected - The currently pinned device.
 * @returns The devices section.
 */
function DevicesSection({
  devices,
  selected,
}: {
  devices: readonly SidecarDevice[];
  selected: string;
}): React.JSX.Element {
  return (
    <MenuBarExtra.Section title="Devices">
      {devices.map((device) => (
        <MenuBarExtra.Item
          key={device.uuid}
          title={device.name}
          icon={device.name === selected ? Icon.Checkmark : Icon.Circle}
          onAction={() =>
            runAction(
              () => connectDevice(device.name),
              `Could not connect ${device.name}`,
              connectedMessage(device.name),
            )
          }
        />
      ))}
    </MenuBarExtra.Section>
  );
}

/**
 * The Fix Mirroring action, shown only when BetterDisplay can perform it.
 *
 * @returns The mirror-fix section.
 */
function FixMirroringSection(): React.JSX.Element {
  return (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item
        title="Fix Mirroring"
        icon={Icon.ArrowClockwise}
        tooltip="Fix an iPad that is mirroring your main screen (Sidecar's own mirror mode)"
        onAction={() =>
          runAction(
            () => reconnectVirtualScreens(getBetterDisplayCliPath()),
            "Could not fix mirroring",
            mirroringFixedMessage(),
          )
        }
      />
    </MenuBarExtra.Section>
  );
}

/**
 * The menu-bar icon for the current link and presence state.
 *
 * @param connected - Whether the link is up.
 * @param nearby    - Presence while disconnected; null when unknown.
 * @returns The monitor glyph, tinted green (connected), full-contrast (nearby),
 *   or greyed out (away, or the probe could not answer).
 *
 * NOTE: One glyph throughout, so the item never changes shape in the menu bar —
 *   only its weight changes, which is what a status light should do. Green reads
 *   as attached, full-contrast as available-to-connect, greyed-out as nothing to
 *   connect to (which makes a quiet auto-reconnect read as "nothing to do"
 *   rather than "broken"). An unanswered probe greys out too: wrongly looking
 *   unavailable is a kinder error than inviting a click that cannot work.
 */
function statusIcon(connected: boolean, nearby: boolean | null): { source: Icon; tintColor: Color } {
  if (connected) {
    return { source: Icon.Monitor, tintColor: Color.Green };
  }
  if (nearby === true) {
    return { source: Icon.Monitor, tintColor: Color.PrimaryText };
  }
  return { source: Icon.Monitor, tintColor: Color.SecondaryText };
}

/**
 * The menu-bar command.
 *
 * @returns The rendered menu-bar item.
 */
export default function Command(): React.JSX.Element {
  const [model, setModel] = useState<StatusModel | null>(null);

  useEffect(() => {
    loadStatus().then(setModel).catch(setModel.bind(null, EMPTY_MODEL));
  }, []);

  const connected = model?.connected ?? false;
  const device = model?.selected || "Sidecar";
  // Default is icon-only (constant width, friendly to menu-bar managers like
  // Bartender). The optional title shows the device name when connected.
  const showName = getPreferenceValues<Preferences>().showDeviceName === true;
  const nearby = model?.nearby ?? null;
  const icon = statusIcon(connected, nearby);
  const tooltip = presenceTooltip(device, connected, nearby);
  // Named whenever the iPad is actually there — attached or merely within reach —
  // since that is when knowing WHICH iPad is useful. Stays anonymous when it is
  // away, so the item does not carry a name for something you cannot connect to.
  const title = showName && (connected || nearby === true) ? device : undefined;

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={tooltip} isLoading={model === null}>
      {/* Only when nothing is known at all. An out-of-range iPad drops off the
          device list, so an empty list plus a remembered device means "away",
          not "you have no iPad". */}
      {model !== null && model.devices.length === 0 && model.selected === "" && (
        <MenuBarExtra.Item title="No Sidecar devices found" />
      )}

      {model !== null && model.selected !== "" && (
        <DeviceSection selected={model.selected} connected={connected} nearby={model.nearby} />
      )}

      {model !== null && model.devices.length > 1 && (
        <DevicesSection devices={model.devices} selected={model.selected} />
      )}

      {model !== null && connected && model.canReconnectVirtual && <FixMirroringSection />}

      <MenuBarExtra.Section>
        {model !== null && (
          <MenuBarExtra.Item
            title={autoReconnectLabel(model.autoReconnectOn)}
            icon={model.autoReconnectOn ? { source: Icon.Circle, tintColor: Color.Green } : Icon.Circle}
            onAction={() =>
              runAction(() => toggleAutoReconnect(model.autoReconnectOn), "Could not change auto-reconnect")
            }
          />
        )}
        <MenuBarExtra.Item title="Settings…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
