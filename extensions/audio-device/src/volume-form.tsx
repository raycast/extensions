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
  type AudioDevice,
  type IOType,
  getOutputDevices,
  getInputDevices,
  getDefaultOutputDevice,
  getDefaultInputDevice,
  getOutputDeviceVolume,
  getInputDeviceVolume,
  setOutputDeviceVolume,
  setInputDeviceVolume,
  setOutputDeviceMute,
  setInputDeviceMute,
} from "./audio-device";
import { getPinnedVolume, setPinnedVolume, clearPinnedVolume } from "./device-preferences";
import { useState, useRef } from "react";

const ioConfig = {
  output: {
    getDevices: getOutputDevices,
    getDefault: getDefaultOutputDevice,
    getVolume: getOutputDeviceVolume,
    setVolume: setOutputDeviceVolume,
    setMute: setOutputDeviceMute,
    label: "Output",
    enforceCommand: "auto-switch-output",
    enforceLabel: "Enforce Output Device",
  },
  input: {
    getDevices: getInputDevices,
    getDefault: getDefaultInputDevice,
    getVolume: getInputDeviceVolume,
    setVolume: setInputDeviceVolume,
    setMute: setInputDeviceMute,
    label: "Input",
    enforceCommand: "auto-switch-input",
    enforceLabel: "Enforce Input Device",
  },
} as const;

function sortCurrentFirst(devices: AudioDevice[], currentId: string): AudioDevice[] {
  const current = devices.find((d) => d.id === currentId);
  if (!current) return devices;
  return [current, ...devices.filter((d) => d.id !== currentId)];
}

export function VolumeForm({ ioType }: { ioType: IOType }) {
  const config = ioConfig[ioType];
  const { pop } = useNavigation();
  const [selectedId, setSelectedId] = useState<string>("");
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);
  const [pinnedLevel, setPinnedLevel] = useState<number | undefined>(undefined);
  const [pinVolume, setPinVolume] = useState(false);
  const devicesRef = useRef<AudioDevice[]>([]);

  const { data, isLoading } = usePromise(async () => {
    const [devices, current] = await Promise.all([config.getDevices(), config.getDefault()]);
    devicesRef.current = devices;
    setSelectedId(current.id);

    const vol = await config.getVolume(current.id);
    setCurrentVolume(vol != null ? Math.round(vol * 100) : null);

    const device = devices.find((d) => d.id === current.id);
    const pinned = device ? await getPinnedVolume(ioType, device.uid) : undefined;
    setPinnedLevel(pinned);
    setPinVolume(pinned != null);

    return { devices, current };
  });

  async function handleDeviceChange(deviceId: string) {
    setSelectedId(deviceId);

    try {
      const vol = await config.getVolume(deviceId);
      setCurrentVolume(vol != null ? Math.round(vol * 100) : null);
    } catch {
      setCurrentVolume(null);
    }

    const device = devicesRef.current.find((d) => d.id === deviceId);
    const pinned = device ? await getPinnedVolume(ioType, device.uid) : undefined;
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
    const name = device?.name ?? config.label;
    const clamped = Math.max(0, Math.min(100, level));

    try {
      if (clamped > 0) await config.setMute(deviceId, false).catch(() => {});
      await config.setVolume(deviceId, clamped / 100);

      if (device) {
        if (values.pinVolume) {
          await setPinnedVolume(ioType, device.uid, clamped);
        } else if (pinnedLevel != null) {
          await clearPinnedVolume(ioType, device.uid);
        }
      }

      const old = currentVolume != null ? `${currentVolume}%` : "?";
      const pinSuffix = values.pinVolume ? " (pinned)" : pinnedLevel != null ? " (unpinned)" : "";
      await showHUD(`${name}: ${old} -> ${clamped}%${pinSuffix}`);

      if (values.pinVolume) {
        try {
          await launchCommand({ name: config.enforceCommand, type: LaunchType.Background });
        } catch {
          await showToast(
            Toast.Style.Animated,
            `Enable '${config.enforceLabel}'`,
            "The background command must be enabled in Raycast for pinned volumes to be enforced automatically.",
          );
        }
      }

      pop();
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to set ${ioType} volume`, String(error));
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
          <Action.SubmitForm title={`Set ${config.label} Volume`} onSubmit={handleSubmit} />
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
        <Form.Dropdown id="device" title={`${config.label} Device`} value={selectedId} onChange={handleDeviceChange}>
          {sortCurrentFirst(data.devices, data.current.id).map((d: AudioDevice) => (
            <Form.Dropdown.Item
              key={d.id}
              value={d.id}
              title={d.id === data.current.id ? `${d.name} (Current)` : d.name}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description title={`Current ${config.label} Volume`} text={volText} />
      <Form.Separator />
      <Form.TextField
        id="level"
        title={`New ${config.label} Volume`}
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
