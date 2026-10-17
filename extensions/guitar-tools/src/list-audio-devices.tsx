import { List, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAudioInputDevices, type AudioDevice } from "./utils/audio-devices.utils";
import { saveSelectedDevice, getSelectedDevice } from "./utils/AudioDeviceStorage.utils";

export default function ListAudioDevices(props: { onDeviceSelected?: (deviceName: string) => void }) {
  const { pop } = useNavigation();
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const device = await getSelectedDevice();
        setSelectedDevice(device);

        const deviceList = getAudioInputDevices();
        setDevices(deviceList);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleSelectDevice = async (deviceName: string) => {
    await saveSelectedDevice(deviceName);
    setSelectedDevice(deviceName);
    props.onDeviceSelected?.(deviceName);

    await showToast({
      style: Toast.Style.Success,
      title: "Device Selected",
      message: `"${deviceName}" is now the active input device for the tuner`,
    });

    pop();
  };

  return (
    <List isLoading={isLoading}>
      {devices.map((device) => (
        <List.Item
          key={device.name}
          title={device.name}
          subtitle={`${device.manufacturer} • ${device.channels} channel(s)`}
          accessories={[
            { text: device.type },
            ...(device.name === selectedDevice ? [{ icon: Icon.Checkmark, tooltip: "Currently selected" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Select This Device"
                icon={Icon.Checkmark}
                onAction={() => handleSelectDevice(device.name)}
              />
              <Action.CopyToClipboard title="Copy Device Name" content={device.name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
