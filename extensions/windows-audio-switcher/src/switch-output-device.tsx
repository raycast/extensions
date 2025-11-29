import { List, Action, ActionPanel, showToast, Toast, LocalStorage } from "@raycast/api";
import { AudioDevice } from "./utils/audioDeviceCmdlets";
import React from "react";

import { setDefaultAudioDevice } from "./utils/audioDeviceCmdlets";

async function setOutputDevice(device: AudioDevice, mode: "Both" | "Default" | "Comm") {
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
    } else {
      throw new Error("Failed to set output device");
    }
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to set output device",
      message: err instanceof Error ? err.message : "An unknown error occurred.",
    });
  }
}

export default function Command() {
  const [devices, setDevices] = React.useState<AudioDevice[]>([]);

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
              <Action title="Set as Default Output" onAction={() => setOutputDevice(device, "Default")} />
              <Action title="Set as Communication Output" onAction={() => setOutputDevice(device, "Comm")} />
              <Action title="Set as Both" onAction={() => setOutputDevice(device, "Both")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
