import { Action, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef } from "react";
import { type AudioDevice, getOutputDeviceVolume, setOutputDeviceVolume } from "./audio-device";
import { type VolumeInfo } from "./device-accessories";
import { getPinnedVolume, setPinnedVolume } from "./device-preferences";

export function OutputVolumeActions({
  device,
  volumeInfo,
  onVolumeUpdate,
  onPinnedChange,
}: {
  device: AudioDevice;
  volumeInfo?: VolumeInfo;
  onVolumeUpdate: (deviceUid: string, update: Partial<VolumeInfo>) => void;
  onPinnedChange: () => void;
}) {
  const pending = useRef(Promise.resolve());

  if (volumeInfo?.volume == null) return null;

  function adjustVolume(change: number) {
    // The queue keeps rapid key presses from reading the same volume before a write completes.
    pending.current = pending.current.then(async () => {
      try {
        const current = await getOutputDeviceVolume(device.id);
        if (current == null || !Number.isFinite(current)) {
          await showToast(Toast.Style.Failure, "Cannot Read Current Volume", device.name);
          return;
        }

        const level = Math.max(0, Math.min(100, Math.round(current * 100) + change));
        await setOutputDeviceVolume(device.id, level / 100);
        onVolumeUpdate(device.uid, { volume: level / 100 });
        if ((await getPinnedVolume("output", device.uid)) != null) {
          await setPinnedVolume("output", device.uid, level);
          onPinnedChange();
        }
        await showToast(Toast.Style.Success, `${device.name}: ${level}%`);
      } catch (error) {
        await showFailureToast(error, { title: `Failed to Adjust Volume for ${device.name}` });
      }
    });
    return pending.current;
  }

  return (
    <>
      <Action
        title="Turn up Volume"
        icon={Icon.SpeakerUp}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "=" },
          Windows: { modifiers: ["ctrl"], key: "=" },
        }}
        onAction={() => adjustVolume(5)}
      />
      <Action
        title="Turn Down Volume"
        icon={Icon.SpeakerDown}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "-" },
          Windows: { modifiers: ["ctrl"], key: "-" },
        }}
        onAction={() => adjustVolume(-5)}
      />
    </>
  );
}
