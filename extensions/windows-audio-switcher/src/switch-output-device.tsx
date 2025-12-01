import { List, Action, ActionPanel, showToast, Toast, LocalStorage } from "@raycast/api";
import { AudioDevice, getAllAudioDevices } from "./utils/audioDeviceCmdlets";
import React from "react";

import { setDefaultAudioDevice } from "./utils/audioDeviceCmdlets";

async function setOutputDevice(device: AudioDevice, mode: "Both" | "Default" | "Comm"): Promise<boolean> {
  await showToast({
    style: Toast.Style.Animated,
    title: `Switching output device...`,
    message: device.Name,
  });

  try {
    let success = false;

    switch (mode) {
      case "Default":
        success = await setDefaultAudioDevice(device.ID, true, false);
        break;
      case "Comm":
        success = await setDefaultAudioDevice(device.ID, false, true);
        break;
      default:
        success = await setDefaultAudioDevice(device.ID, false, false);
        break;
    }

    if (success) {
      await showToast({
        style: Toast.Style.Success,
        title: "Output device set",
        message: `${device.Name} (${mode})`,
      });
      return true;
    } else {
      throw new Error("Failed to set output device");
    }
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to set output device",
      message: err instanceof Error ? err.message : "An unknown error occurred.",
    });
    return false;
  }
}

export default function Command() {
  const [devices, setDevices] = React.useState<AudioDevice[]>([]);
  const latestRequestId = React.useRef(0);

  const refreshDevices = async () => {
    const requestId = latestRequestId.current;
    const allDevices = await getAllAudioDevices();
    if (requestId !== latestRequestId.current) return;

    await LocalStorage.setItem("audio-devices", JSON.stringify(allDevices));
    const outputDevices = allDevices
      .filter((device: AudioDevice) => device.Type === "Playback")
      .sort((a: AudioDevice, b: AudioDevice) => a.Index - b.Index);
    setDevices(outputDevices);
  };

  const handleSetDevice = async (device: AudioDevice, mode: "Both" | "Default" | "Comm") => {
    const requestId = ++latestRequestId.current;
    const previousDevices = [...devices];

    const optimisticDevices = devices.map((d) => {
      const newDevice = { ...d };
      if (mode === "Default" || mode === "Both") {
        newDevice.Default = d.ID === device.ID;
      }
      if (mode === "Comm" || mode === "Both") {
        newDevice.DefaultCommunication = d.ID === device.ID;
      }
      return newDevice;
    });
    setDevices(optimisticDevices);

    const success = await setOutputDevice(device, mode);

    if (requestId === latestRequestId.current) {
      if (success) {
        await refreshDevices();
      } else {
        setDevices(previousDevices);
      }
    }
  };

  React.useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>("audio-devices");
      if (stored) {
        try {
          const allDevices = JSON.parse(stored);
          const outputDevices = allDevices
            .filter((device: AudioDevice) => device.Type === "Playback")
            .sort((a: AudioDevice, b: AudioDevice) => a.Index - b.Index);
          setDevices(outputDevices);
        } catch {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid stored devices",
          });
        }
      }
    })();
  }, []);

  return (
    <List searchBarPlaceholder="Search output audio devices...">
      {devices.map((device) => (
        <List.Item
          key={device.ID}
          title={device.Name}
          subtitle={`Output (Index ${device.Index})`}
          accessories={[
            { text: device.Default ? "Default" : "" },
            { text: device.DefaultCommunication ? "Communication" : "" },
          ].filter((accessory) => accessory.text)}
          actions={
            <ActionPanel>
              <Action title="Set as Default Output" onAction={() => handleSetDevice(device, "Default")} />
              <Action title="Set as Communication Output" onAction={() => handleSetDevice(device, "Comm")} />
              <Action title="Set as Both" onAction={() => handleSetDevice(device, "Both")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
