import {
  showToast,
  Toast,
  showHUD,
  Form,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getInputDevices,
  getDefaultInputDevice,
  getInputDeviceVolume,
  setInputDeviceVolume,
  setInputDeviceMute,
  type AudioDevice,
} from "./audio-device";
import { getPinnedVolume, setPinnedVolume, clearPinnedVolume } from "./device-preferences";
import { useState, useRef } from "react";

async function loadPinState(devices: AudioDevice[], deviceId: string) {
  const device = devices.find((d) => d.id === deviceId);
  if (!device) return undefined;
  return getPinnedVolume("input", device.uid);
}

function sortCurrentFirst(devices: AudioDevice[], currentId: string): AudioDevice[] {
  const current = devices.find((d) => d.id === currentId);
  if (!current) return devices;
  return [current, ...devices.filter((d) => d.id !== currentId)];
}

export default function Command() {
  const { pop } = useNavigation();
  const [selectedId, setSelectedId] = useState<string>("");
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);
  const [pinnedLevel, setPinnedLevel] = useState<number | undefined>(undefined);
  const [pinVolume, setPinVolume] = useState(false);
  const devicesRef = useRef<AudioDevice[]>([]);

  const { data, isLoading } = usePromise(async () => {
    const [devices, current] = await Promise.all([getInputDevices(), getDefaultInputDevice()]);
    devicesRef.current = devices;
    setSelectedId(current.id);

    const vol = await getInputDeviceVolume(current.id);
    setCurrentVolume(vol != null ? Math.round(vol * 100) : null);

    const pinned = await loadPinState(devices, current.id);
    setPinnedLevel(pinned);
    setPinVolume(pinned != null);

    return { devices, current };
  });

  async function handleDeviceChange(deviceId: string) {
    setSelectedId(deviceId);

    try {
      const vol = await getInputDeviceVolume(deviceId);
      setCurrentVolume(vol != null ? Math.round(vol * 100) : null);
    } catch {
      setCurrentVolume(null);
    }

    const pinned = await loadPinState(devicesRef.current, deviceId);
    setPinnedLevel(pinned);
    setPinVolume(pinned != null);
  }

  async function handleSubmit(values: { level: string; device?: string; pinVolume?: boolean }) {
    const level = parseInt(values.level, 10);
    if (isNaN(level)) {
      await showToast(Toast.Style.Failure, "Invalid input", "Enter a number 0-100");
      return;
    }

    const deviceId = values.device || selectedId;
    const device = devicesRef.current.find((d) => d.id === deviceId);
    const name = device?.name ?? "Input";
    const clamped = Math.max(0, Math.min(100, level));

    try {
      if (clamped > 0) await setInputDeviceMute(deviceId, false).catch(() => {});
      await setInputDeviceVolume(deviceId, clamped / 100);

      if (device) {
        if (values.pinVolume) {
          await setPinnedVolume("input", device.uid, clamped);
        } else if (pinnedLevel != null) {
          await clearPinnedVolume("input", device.uid);
        }
      }

      const old = currentVolume != null ? `${currentVolume}%` : "?";
      const pinSuffix = values.pinVolume ? " (pinned)" : pinnedLevel != null ? " (unpinned)" : "";
      await showHUD(`${name}: ${old} -> ${clamped}%${pinSuffix}`);

      if (values.pinVolume) {
        try {
          await launchCommand({ name: "auto-switch-input", type: LaunchType.Background });
        } catch {
          await showToast(
            Toast.Style.Animated,
            "Enable 'Enforce Input Device'",
            "The background command must be enabled in Raycast for pinned volumes to be enforced automatically.",
          );
        }
      }

      pop();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to set input volume", String(error));
    }
  }

  const volText = isLoading
    ? "Loading..."
    : currentVolume != null
      ? pinnedLevel != null
        ? `${currentVolume}% (Pinned: ${pinnedLevel}%)`
        : `${currentVolume}%`
      : "Unknown";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Input Volume" onSubmit={handleSubmit} />
          <Action
            title={pinVolume ? "Unpin Volume" : "Pin Volume"}
            icon={pinVolume ? Icon.PinDisabled : Icon.Pin}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={() => setPinVolume(!pinVolume)}
          />
        </ActionPanel>
      }
    >
      {data && data.devices.length > 0 && (
        <Form.Dropdown id="device" title="Input Device" value={selectedId} onChange={handleDeviceChange}>
          {sortCurrentFirst(data.devices, data.current.id).map((d: AudioDevice) => (
            <Form.Dropdown.Item
              key={d.id}
              value={d.id}
              title={d.id === data.current.id ? `${d.name} (Current)` : d.name}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description title="Current Input Volume" text={volText} />
      <Form.Separator />
      <Form.TextField
        id="level"
        title="New Input Volume"
        placeholder="0-100"
        defaultValue={currentVolume != null ? String(currentVolume) : ""}
        info="Enter 0-100"
        autoFocus
      />
      <Form.Checkbox
        id="pinVolume"
        label="Pin Volume"
        value={pinVolume}
        onChange={setPinVolume}
        info="Pinned volume is automatically enforced by the background auto-switcher"
      />
    </Form>
  );
}
