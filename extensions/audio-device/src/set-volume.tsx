import { showToast, Toast, showHUD, Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getOutputDevices,
  getDefaultOutputDevice,
  getOutputDeviceVolume,
  setOutputDeviceVolume,
  setOutputDeviceMute,
  type AudioDevice,
} from "./audio-device";
import { useState, useCallback } from "react";

export default function Command() {
  const { pop } = useNavigation();
  const [selectedId, setSelectedId] = useState<string>("");
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);

  const { data, isLoading } = usePromise(async () => {
    const [devices, current] = await Promise.all([getOutputDevices(), getDefaultOutputDevice()]);
    setSelectedId(current.id);
    const vol = await getOutputDeviceVolume(current.id);
    setCurrentVolume(vol != null ? Math.round(vol * 100) : null);
    return { devices, current };
  });

  const handleDeviceChange = useCallback(async (deviceId: string) => {
    setSelectedId(deviceId);
    try {
      const vol = await getOutputDeviceVolume(deviceId);
      setCurrentVolume(vol != null ? Math.round(vol * 100) : null);
    } catch {
      setCurrentVolume(null);
    }
  }, []);

  async function handleSubmit(values: { level: string; device?: string }) {
    const level = parseInt(values.level, 10);
    if (isNaN(level)) {
      await showToast(Toast.Style.Failure, "Invalid input", "Enter a number 0-100");
      return;
    }

    const deviceId = values.device || selectedId;
    const device = data?.devices.find((d: AudioDevice) => d.id === deviceId);
    const name = device?.name ?? "Output";
    const clamped = Math.max(0, Math.min(100, level));

    try {
      if (clamped > 0) await setOutputDeviceMute(deviceId, false);
      await setOutputDeviceVolume(deviceId, clamped / 100);

      const old = currentVolume != null ? `${currentVolume}%` : "?";
      await showHUD(`${name}: ${old} -> ${clamped}%`);
      pop();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to set volume", String(error));
    }
  }

  const volText = isLoading ? "Loading..." : currentVolume != null ? `${currentVolume}%` : "Unknown";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Volume" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {data && data.devices.length > 0 && (
        <Form.Dropdown id="device" title="Output Device" value={selectedId} onChange={handleDeviceChange}>
          {data.devices.map((d: AudioDevice) => (
            <Form.Dropdown.Item
              key={d.id}
              value={d.id}
              title={d.id === data.current.id ? `${d.name} (Current)` : d.name}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description title="Current Volume" text={volText} />
      <Form.Separator />
      <Form.TextField
        id="level"
        title="New Volume"
        placeholder="0-100"
        defaultValue={currentVolume != null ? String(currentVolume) : ""}
        info="Enter 0-100"
        autoFocus
      />
    </Form>
  );
}
