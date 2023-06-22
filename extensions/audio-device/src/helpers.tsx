import {
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Color,
  getPreferenceValues,
  Icon,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  Action,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  AudioDevice,
  getInputDevices,
  getOutputDevices,
  getDefaultInputDevice,
  getDefaultOutputDevice,
  setDefaultInputDevice,
  setDefaultOutputDevice,
  setDefaultSystemDevice,
  TransportType,
} from "./audio-device";

type UseAudioDevicesResponse = {
  isLoading: boolean;
  data: {
    devices: AudioDevice[];
    current: AudioDevice;
  };
};

export function useAudioDevices(type: "input" | "output") {
  const [isLoading, setIsLoading] = useState(true);
  const [audioDevices, setAudioDevices] = useState<UseAudioDevicesResponse["data"]>();

  useEffect(() => {
    const fetchDevices = async () => {
      const devices = await (type === "input" ? getInputDevices() : getOutputDevices());
      const current = await (type === "input" ? getDefaultInputDevice() : getDefaultOutputDevice());

      return {
        devices,
        current,
      };
    };

    fetchDevices()
      .then(setAudioDevices)
      .catch((err) => showToast(Toast.Style.Failure, `There was an error fetching the audio devices.`, err.message))
      .finally(() => setIsLoading(false));
  }, [type]);

  return {
    isLoading,
    data: audioDevices,
  };
}

type DeviceListProps = {
  type: "input" | "output";
};

export function DeviceList({ type }: DeviceListProps) {
  const { isLoading, data } = useAudioDevices(type);
  const subtitle = (device: AudioDevice) =>
    Object.entries(TransportType).find(([, v]) => v === device.transportType)?.[0];

  return (
    <List isLoading={isLoading}>
      {data &&
        data.devices.map((d) => (
          <List.Item
            key={d.uid}
            title={d.name}
            subtitle={subtitle(d)}
            icon={deviceIcon(d)}
            actions={
              <ActionPanel>
                <SetAudioDeviceAction device={d} type={type} />
                <Action
                  title={`Copy Device Name to Clipboard`}
                  onAction={async () => {
                    await Clipboard.copy(d.name);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Device name copied to the clipboard",
                    });
                  }}
                />
              </ActionPanel>
            }
            accessories={[
              {
                icon: d.uid === data.current.uid ? Icon.Checkmark : undefined,
              },
            ]}
          />
        ))}
    </List>
  );
}

type SetAudioDeviceActionProps = {
  device: AudioDevice;
  type: "input" | "output";
};

function SetAudioDeviceAction({ device, type }: SetAudioDeviceActionProps) {
  return (
    <Action
      title={`Select ${device.name}`}
      onAction={async () => {
        try {
          await (type === "input" ? setDefaultInputDevice(device.id) : setOutputAndSystemDevice(device.id));
          closeMainWindow({ clearRootSearch: true });
          popToRoot({ clearSearchBar: true });
          showHUD(`Active ${type} audio device set to ${device.name}`);
        } catch (e) {
          console.log(e);
          showToast(
            Toast.Style.Failure,
            `Error!`,
            `There was an error setting the active ${type} audio device to ${device.name}`
          );
        }
      }}
    />
  );
}

async function setOutputAndSystemDevice(deviceId: string) {
  const { systemOutput } = getPreferenceValues();
  await setDefaultOutputDevice(deviceId);
  if (systemOutput) {
    await setDefaultSystemDevice(deviceId);
  }
}

export function deviceIcon(device: AudioDevice) {
  return {
    source: device.isInput ? "mic.png" : "speaker.png",
    tintColor: Color.SecondaryText,
  };
}
