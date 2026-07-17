import { Action, ActionPanel, Icon, Keyboard, Toast, closeMainWindow, showToast } from "@raycast/api";
import {
  connectDevice,
  disconnectDevice,
  getAppState,
  getDevices,
  setFavorite,
  setListeningMode,
  setPinned,
  showDeviceMenu,
  showStatusWindow,
  toggleSpatialAudio,
} from "../airbuddy";
import { failToast, showFailure } from "../feedback";
import { pollUntil } from "../poll";
import { BatteryAlertsForm } from "../battery-alerts";
import {
  LISTENING_MODE_LABELS,
  SPATIAL_AUDIO_LABELS,
  type Device,
  type ListeningMode,
  isAudioDevice,
  isConnectable,
  isDisconnectable,
  listeningModeIcon,
  supportsListeningMode,
} from "../types";

export function DeviceActions({ device, onRefresh }: { device: Device; onRefresh: () => void }) {
  // Defensive: the JXA payload is cast, not validated, and AirBuddyHelper can return a transiently
  // incomplete device object if it's mid-restart when queried — observed live as a runtime
  // `Cannot read properties of undefined (reading 'includes')` crash during development.
  const supportedActions = device.supportedActions ?? [];

  async function handleConnect() {
    // Fire the indicator BEFORE the async work. Silence during a long operation is a defect.
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Connecting to ${device.name}…`,
    });

    try {
      await connectDevice(device.id);

      // The command returns on request-ACCEPT, not on Bluetooth settle. Poll the real postcondition.
      await pollUntil(
        () => getDevices(),
        (devices) => devices.find((d) => d.id === device.id)?.connected === true,
        { description: `${device.name} never connected` },
      );

      toast.style = Toast.Style.Success;
      toast.title = `Connected to ${device.name}`;
      onRefresh();
    } catch (error) {
      await showFailure(`Couldn't connect to ${device.name}`, error);
    }
  }

  async function handleDisconnect() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Disconnecting ${device.name}…`,
    });

    try {
      await disconnectDevice(device.id);
      await pollUntil(
        () => getDevices(),
        (devices) => devices.find((d) => d.id === device.id)?.connected !== true,
        { description: `${device.name} never disconnected` },
      );

      toast.style = Toast.Style.Success;
      toast.title = `Disconnected ${device.name}`;
      onRefresh();
    } catch (error) {
      await showFailure(`Couldn't disconnect ${device.name}`, error);
    }
  }

  async function handleToggleSpatialAudio() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling Spatial Audio…" });

    try {
      const state = await getAppState();

      // Fail fast. With no audio output route, AirBuddy accepts the toggle and silently no-ops
      // it, so polling for a change that can never come spins for the full timeout and then
      // blames the extension. (This action sits on every row — including the trackpad.)
      if (!state.currentOutputName) {
        failToast(toast, "No audio output device", "Connect a headset before changing Spatial Audio.");
        return;
      }

      // Fire-and-forget, like every AirBuddy action: the command returns on request-accept,
      // not when the mode actually changes. Poll the real postcondition, and name the result.
      const before = state.spatialAudioMode;

      await toggleSpatialAudio(device.id);

      const after = await pollUntil(
        () => getAppState(),
        (state) => state.spatialAudioMode !== before,
        { description: "Spatial Audio never changed" },
      );

      toast.style = Toast.Style.Success;
      toast.title = SPATIAL_AUDIO_LABELS[after.spatialAudioMode];
    } catch (error) {
      await showFailure("Couldn't toggle Spatial Audio", error);
    }
  }

  async function handleSetMode(mode: ListeningMode) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Setting ${LISTENING_MODE_LABELS[mode]}…` });

    try {
      // Already on it? Say so rather than dispatching a no-op and claiming we "set" it. Re-fetch
      // rather than trusting `device.listeningMode`: that's the row's cached snapshot, up to 5s
      // stale (the poll interval), so it can disagree with reality. Trusting it could report
      // "Already Noise Cancellation" for a device AirBuddy had already switched to Transparency —
      // skipping the real setListeningMode call the user asked for.
      const current = await getDevices();
      if (current.find((d) => d.id === device.id)?.listeningMode === mode) {
        toast.style = Toast.Style.Success;
        toast.title = `Already ${LISTENING_MODE_LABELS[mode]}`;
        return;
      }

      await setListeningMode(mode, device.id);
      await pollUntil(
        () => getDevices(),
        (devices) => devices.find((d) => d.id === device.id)?.listeningMode === mode,
        { description: `${device.name} never switched to ${LISTENING_MODE_LABELS[mode]}` },
      );
      toast.style = Toast.Style.Success;
      toast.title = LISTENING_MODE_LABELS[mode];
      onRefresh();
    } catch (error) {
      await showFailure("Couldn't change listening mode", error);
    }
  }

  async function handleTogglePinned() {
    const next = !device.pinned;
    try {
      await setPinned(device.id, next);
      onRefresh();
    } catch (error) {
      await showFailure(`Couldn't ${next ? "pin" : "unpin"} ${device.name}`, error);
    }
  }

  async function handleToggleFavorite() {
    const next = !device.favorite;
    try {
      await setFavorite(device.id, next);
      onRefresh();
    } catch (error) {
      await showFailure(`Couldn't ${next ? "favorite" : "unfavorite"} ${device.name}`, error);
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {/*
          `supportedActions` is state-aware, not just kind-based (live-verified against AirBuddy
          911): a connected headset gains "disconnect" and loses "connect", and accessories like a
          Magic Trackpad DO carry "connect" — the old `kind === "headset"` guess excluded them.
        */}
        {device.connected
          ? isDisconnectable(device) && <Action title="Disconnect" icon={Icon.Plug} onAction={handleDisconnect} />
          : isConnectable(device) && <Action title="Connect" icon={Icon.Plug} onAction={handleConnect} />}

        {/* Rendered ONLY for devices that actually support listening modes. */}
        {supportsListeningMode(device) && (
          <ActionPanel.Submenu
            title="Listening Mode"
            icon={listeningModeIcon(device.listeningMode ?? "normal")}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          >
            {device.supportedListeningModes.map((mode) => {
              const isCurrent = mode === device.listeningMode;
              return (
                <Action
                  key={mode}
                  // Checkmark the active mode, the way macOS Settings and AirBuddy's own Noise
                  // Control menu do. Raycast's Action has no checked state and no `subtitle` prop
                  // (tsc rejects it — though `ray build` compiles it happily), so the title is the
                  // only channel available. A trailing ✓ reads clearly enough.
                  title={isCurrent ? `${LISTENING_MODE_LABELS[mode]} ✓` : LISTENING_MODE_LABELS[mode]}
                  icon={listeningModeIcon(mode)}
                  onAction={() => handleSetMode(mode)}
                />
              );
            })}
          </ActionPanel.Submenu>
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Show Status Window"
          icon={Icon.Window}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={async () => {
            try {
              // Close Raycast FIRST — otherwise AirBuddy's native window opens behind it and the
              // user sees nothing happen.
              await closeMainWindow();
              await showStatusWindow(device.id);
            } catch (error) {
              await showFailure("Couldn't show the status window", error);
            }
          }}
        />
        {/*
          `supportedActions` includes "show device menu" only for headsets (live-verified) — the
          sdef's HEADSET-ONLY prose is now backed by a live capability check instead of a
          `kind === "headset"` guess, the same fix applied to connect/disconnect above.
        */}
        {supportedActions.includes("show device menu") && (
          <Action
            title="Show Device Menu"
            icon={Icon.List}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
            onAction={async () => {
              try {
                // Close Raycast FIRST — AirBuddy's menu would otherwise open behind it.
                await closeMainWindow();
                await showDeviceMenu(device.id);
              } catch (error) {
                await showFailure("Couldn't show the device menu", error);
              }
            }}
          />
        )}
        <Action.Push
          title="Configure Battery Alerts"
          icon={Icon.Bell}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<BatteryAlertsForm device={device} />}
        />
        {/*
          Spatial Audio is an APPLICATION-level property in AirBuddy's API — it applies to the
          current output route, not to a device you select. Offering it on a keyboard or a
          trackpad row was a category error: global state wearing a device costume. Show it only
          on a device that can actually carry an audio route.
        */}
        {isAudioDevice(device) && (
          <Action
            title="Toggle Spatial Audio"
            icon={Icon.Speaker}
            // No Common member means "toggle a setting", so this is deliberately custom. cmd+shift+A
            // is free in this panel and collides with nothing in Keyboard.Shortcut.Common.
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={handleToggleSpatialAudio}
          />
        )}
      </ActionPanel.Section>

      {/* NEW in AirBuddy 911: `pinned`/`favorite` became settable (`access="rw"`), not just readable. */}
      {(supportedActions.includes("pin") || supportedActions.includes("favorite")) && (
        <ActionPanel.Section>
          {supportedActions.includes("pin") && (
            <Action
              title={device.pinned ? "Unpin" : "Pin"}
              icon={device.pinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={handleTogglePinned}
            />
          )}
          {/* Sdef: "setting true replaces the previous favorite" — only one device can be favorite. */}
          {supportedActions.includes("favorite") && (
            <Action
              title={device.favorite ? "Remove as Favorite" : "Set as Favorite"}
              icon={device.favorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={handleToggleFavorite}
            />
          )}
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
        <Action.CopyToClipboard title="Copy Device ID" content={device.id} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard
          title="Copy Device Name"
          content={device.name}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
