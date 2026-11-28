// Device actions in the Output Device / Input Device list (priority actions live in priority-actions.tsx).
// The list updates first; the change is then applied and undone if it fails.
import { Action, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { type AudioDevice, type VolumeInfo, errorMessage, setDefaultDevice, toggleMute } from "./audio-device";
import { actionIcon } from "./device-icon-assets";
import { recordCurrentDevice } from "./device-preferences";
import type { DeviceStore } from "./device-store";
import { launchAutoSwitch } from "./launch-auto-switch";
import { ACTION_ICON, PIN_ICON, UNPIN_ICON } from "./priority/icon-pool";
import { runExclusive } from "./switch-lock";

type DeviceProps = { device: AudioDevice; store: DeviceStore };

const percent = (volume: number | undefined) => (volume != null ? Math.round(volume * 100) : undefined);

export function SelectDeviceAction({
  device,
  store,
  onSelect,
}: DeviceProps & {
  /** Mark a device as current in the list; undefined goes back to what the system reports. */
  onSelect: (uid: string | undefined) => void;
}) {
  const ioType = store.ioType;
  return (
    <Action
      title="Select Device"
      icon={
        ioType === "input"
          ? actionIcon(ACTION_ICON.selectInput, Icon.Microphone)
          : actionIcon(ACTION_ICON.selectOutput, Icon.SpeakerOn)
      }
      onAction={async () => {
        onSelect(device.uid);
        try {
          // Waits for a running automatic switch, so this manual choice is applied last (see switch-lock.ts).
          await runExclusive(ioType, async () => {
            await setDefaultDevice(ioType, device.id);
            // A manual choice: Auto Switch keeps it until the next connect or disconnect. The device list is read
            // fresh here: a stale list would make a device that connected meanwhile look new and undo the choice.
            await recordCurrentDevice(ioType, device.uid);
          });
          await showToast(Toast.Style.Success, `Set "${store.nameOf(device)}" as ${ioType} device`);
          // Refreshes the Enable Auto Switch subtitle (devices in use); the manual choice itself is kept.
          await launchAutoSwitch("silent");
        } catch (error) {
          onSelect(undefined);
          await showFailureToast(error, {
            title: `Could not select "${store.nameOf(device)}"`,
            message: errorMessage(error),
          });
        }
      }}
    />
  );
}

export function ToggleHiddenDeviceAction({ device, store }: DeviceProps) {
  const isHidden = store.hidden.includes(device.uid);
  return (
    <Action
      title={isHidden ? "Show Device" : "Hide Device"}
      icon={isHidden ? actionIcon(ACTION_ICON.show, Icon.Eye) : actionIcon(ACTION_ICON.hide, Icon.EyeDisabled)}
      shortcut={{ modifiers: ["cmd", "shift"], key: isHidden ? "s" : "h" }}
      onAction={() => store.toggleHidden(device.uid)}
    />
  );
}

export function ToggleShowHiddenDevicesAction({ store }: { store: DeviceStore }) {
  const isShowing = store.isShowingHidden;
  return (
    <Action
      title={isShowing ? "Hide Hidden Devices" : "Show Hidden Devices"}
      icon={isShowing ? actionIcon(ACTION_ICON.hide, Icon.EyeDisabled) : actionIcon(ACTION_ICON.show, Icon.Eye)}
      shortcut={{ modifiers: ["opt", "shift"], key: isShowing ? "h" : "s" }}
      onAction={() => store.setShowHidden(!isShowing)}
    />
  );
}

/** Shown only for devices that report a mute state. */
export function ToggleMuteAction({
  device,
  store,
  volume,
  onChange,
}: DeviceProps & { volume?: VolumeInfo; onChange: (update: Partial<VolumeInfo>) => void }) {
  if (volume?.muted == null) return null;
  const ioType = store.ioType;
  const isMuted = volume.muted;

  return (
    <Action
      title={isMuted ? "Unmute Device" : "Mute Device"}
      icon={
        isMuted
          ? actionIcon(ACTION_ICON.unmute[ioType], Icon.SpeakerOn)
          : actionIcon(ACTION_ICON.mute[ioType], Icon.SpeakerOff)
      }
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      onAction={async () => {
        onChange({ muted: !isMuted });
        try {
          const muted = await toggleMute(ioType, device.id);
          onChange({ muted });
          const level = percent(volume.volume);
          await showToast(
            Toast.Style.Success,
            muted
              ? `Muted ${store.nameOf(device)}`
              : `Unmuted ${store.nameOf(device)}${level != null ? ` (${level}%)` : ""}`,
          );
        } catch (error) {
          onChange({ muted: isMuted });
          await showFailureToast(error, {
            title: `Could not change mute for ${store.nameOf(device)}`,
            message: errorMessage(error),
          });
        }
      }}
    />
  );
}

/** Pin the current volume (Auto Switch restores it), or unpin. */
export function PinVolumeAction({ device, store, volume }: DeviceProps & { volume?: VolumeInfo }) {
  const pinnedLevel = store.pinned.get(device.uid);
  if (pinnedLevel != null) {
    return (
      <Action
        title={`Unpin Volume (${pinnedLevel}%)`}
        icon={actionIcon(UNPIN_ICON, Icon.PinDisabled)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        onAction={async () => {
          await store.setPinned(device.uid, undefined);
          await showToast(Toast.Style.Success, `Unpinned volume for ${store.nameOf(device)}`);
        }}
      />
    );
  }

  const level = percent(volume?.volume);
  return (
    <Action
      title={level != null ? `Pin Volume at ${level}%` : "Pin Volume"}
      icon={actionIcon(PIN_ICON, Icon.Pin)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      onAction={async () => {
        if (level == null) {
          await showToast(Toast.Style.Failure, "This device has no volume to pin");
          return;
        }
        await store.setPinned(device.uid, level);
        await showToast(Toast.Style.Success, `Pinned ${store.nameOf(device)} at ${level}%`);
        await launchAutoSwitch("pinned volumes");
      }}
    />
  );
}
