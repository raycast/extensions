import { showToast, Toast, Form, ActionPanel, Action, Icon, launchCommand, LaunchType } from "@raycast/api";
import { usePromise, useForm } from "@raycast/utils";
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
import { useRef, useState } from "react";

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
  const current = devices.find((d) => String(d.id) === currentId);
  if (!current) return devices;
  return [current, ...devices.filter((d) => String(d.id) !== currentId)];
}

interface VolumeFormValues {
  device: string;
  level: string;
  pinVolume: boolean;
}

export function VolumeForm({ ioType }: { ioType: IOType }) {
  const config = ioConfig[ioType];
  const devicesRef = useRef<AudioDevice[]>([]);
  const currentVolumeRef = useRef<number | null>(null);
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);
  const pinnedLevelRef = useRef<number | undefined>(undefined);

  const { handleSubmit, itemProps, setValue, values } = useForm<VolumeFormValues>({
    onSubmit: async (formValues) => {
      const level = parseInt(formValues.level, 10);
      if (isNaN(level)) {
        await showToast(Toast.Style.Failure, "Invalid input", "Enter a number 0-100");
        return;
      }

      const deviceId = formValues.device;
      const device = devicesRef.current.find((d) => String(d.id) === deviceId);
      const name = device?.name ?? config.label;
      const clamped = Math.max(0, Math.min(100, level));

      try {
        if (clamped > 0) await config.setMute(deviceId, false).catch(() => {});
        await config.setVolume(deviceId, clamped / 100);

        if (device) {
          if (formValues.pinVolume) {
            await setPinnedVolume(ioType, device.uid, clamped);
          } else if (pinnedLevelRef.current != null) {
            await clearPinnedVolume(ioType, device.uid);
          }
        }

        const old = currentVolumeRef.current != null ? `${currentVolumeRef.current}%` : "?";
        const pinSuffix = formValues.pinVolume ? " (pinned)" : pinnedLevelRef.current != null ? " (unpinned)" : "";
        currentVolumeRef.current = clamped;
        setCurrentVolume(clamped);
        pinnedLevelRef.current = formValues.pinVolume ? clamped : undefined;
        await showToast(Toast.Style.Success, `${name}: ${old} -> ${clamped}%${pinSuffix}`);

        if (formValues.pinVolume) {
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
      } catch (error) {
        await showToast(Toast.Style.Failure, `Failed to set ${ioType} volume`, String(error));
      }
    },
    initialValues: {
      device: "",
      level: "",
      pinVolume: false,
    },
  });

  const { data, isLoading } = usePromise(async () => {
    const [devices, current] = await Promise.all([config.getDevices(), config.getDefault()]);
    devicesRef.current = devices;

    const vol = await config.getVolume(current.id);
    const volPct = vol != null ? Math.round(vol * 100) : null;
    currentVolumeRef.current = volPct;
    setCurrentVolume(volPct);

    const device = devices.find((d) => String(d.id) === String(current.id));
    const pinned = device ? await getPinnedVolume(ioType, device.uid) : undefined;
    pinnedLevelRef.current = pinned;

    setValue("device", String(current.id));
    if (volPct != null) setValue("level", String(volPct));
    setValue("pinVolume", pinned != null);

    return { devices, current };
  });

  async function handleDeviceChange(deviceId: string) {
    try {
      const vol = await config.getVolume(deviceId);
      const volPct = vol != null ? Math.round(vol * 100) : null;
      currentVolumeRef.current = volPct;
      setCurrentVolume(volPct);
      if (volPct != null) setValue("level", String(volPct));
    } catch {
      currentVolumeRef.current = null;
      setCurrentVolume(null);
    }

    const device = devicesRef.current.find((d) => String(d.id) === deviceId);
    const pinned = device ? await getPinnedVolume(ioType, device.uid) : undefined;
    pinnedLevelRef.current = pinned;
    setValue("pinVolume", pinned != null);
  }

  const volText = isLoading ? "Loading..." : currentVolume != null ? `${currentVolume}%` : "Unknown";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Set ${config.label} Volume`} onSubmit={handleSubmit} />
          <Action
            title={values.pinVolume ? "Unpin Volume" : "Pin Volume"}
            icon={values.pinVolume ? Icon.PinDisabled : Icon.Pin}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={() => setValue("pinVolume", !values.pinVolume)}
          />
        </ActionPanel>
      }
    >
      {data && data.devices.length > 0 && (
        <Form.Dropdown
          {...itemProps.device}
          title={`${config.label} Device`}
          onChange={(val) => {
            itemProps.device.onChange?.(val);
            handleDeviceChange(val);
          }}
        >
          {sortCurrentFirst(data.devices, String(data.current.id)).map((d: AudioDevice) => (
            <Form.Dropdown.Item
              key={String(d.id)}
              value={String(d.id)}
              title={String(d.id) === String(data.current.id) ? `${d.name} (Current)` : d.name}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description title={`Current ${config.label} Volume`} text={volText} />
      <Form.Separator />
      <Form.TextField
        {...itemProps.level}
        title={`New ${config.label} Volume`}
        placeholder="0-100"
        info="Enter 0-100"
        autoFocus
      />
      <Form.Checkbox
        {...itemProps.pinVolume}
        label="Pin Volume"
        info="Pinned volume is automatically enforced by the background auto-switcher"
      />
    </Form>
  );
}
