import {
  ActionPanel,
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
  Keyboard,
} from "@raycast/api";
import { useEffect } from "react";
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
import { createDeepLink } from "./utils";
import { usePromise } from "@raycast/utils";

type DeviceListProps = {
  type: "input" | "output";
  deviceId?: string;
};

export function DeviceList({ type, deviceId }: DeviceListProps) {
  const { isLoading, data } = useAudioDevices(type);

  useEffect(() => {
    if (!deviceId || !data?.devices) return;
    const device = data.devices.find((d) => d.id === deviceId);
    if (!device) {
      showToast(Toast.Style.Failure, "Error!", `The device with id ${deviceId} was not found.`);
      return;
    }

    (async function () {
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
          `There was an error setting the active ${type} audio device to ${device.name}`,
        );
      }
    })();
  }, [deviceId, data, type]);

  return (
    <List isLoading={isLoading}>
      {data &&
        data.devices.map((d) => {
          const isCurrent = d.uid === data.current.uid;
          return (
            <List.Item
              key={d.uid}
              title={d.name}
              subtitle={getSubtitle(d)}
              icon={getIcon(d, d.uid === data.current.uid)}
              actions={
                <ActionPanel>
                  <SetAudioDeviceAction device={d} type={type} />
                  <Action.CreateQuicklink
                    quicklink={{
                      name: `Set ${d.isOutput ? "Output" : "Input"} Device to ${d.name}`,
                      link: createDeepLink(d.isOutput ? "set-output-device" : "set-input-device", {
                        deviceId: d.id,
                      }),
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Device Name"
                    content={d.name}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel>
              }
              accessories={getAccessories(isCurrent)}
            />
          );
        })}
    </List>
  );
}

function useAudioDevices(type: "input" | "output") {
  return usePromise(
    async (type) => {
      const devices = await (type === "input" ? getInputDevices() : getOutputDevices());
      const current = await (type === "input" ? getDefaultInputDevice() : getDefaultOutputDevice());

      return {
        devices,
        current,
      };
    },
    [type],
  );
}

type SetAudioDeviceActionProps = {
  device: AudioDevice;
  type: "input" | "output";
};

function SetAudioDeviceAction({ device, type }: SetAudioDeviceActionProps) {
  return (
    <Action
      title={`Set as ${type === "input" ? "Input" : "Output"} Device`}
      icon={{ source: type === "input" ? "mic.png" : "speaker.png", tintColor: Color.PrimaryText }}
      onAction={async () => {
        try {
          await (type === "input" ? setDefaultInputDevice(device.id) : setOutputAndSystemDevice(device.id));
          closeMainWindow({ clearRootSearch: true });
          popToRoot({ clearSearchBar: true });
          showHUD(`Set "${device.name}" as ${type} device`);
        } catch (e) {
          console.log(e);
          showToast(Toast.Style.Failure, `Failed setting "${device.name}" as ${type} device`);
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

function getIcon(device: AudioDevice, isCurrent: boolean) {
  return {
    source: device.isInput ? "mic.png" : "speaker.png",
    tintColor: isCurrent ? Color.Green : Color.SecondaryText,
  };
}

function getAccessories(isCurrent: boolean) {
  return [
    {
      icon: isCurrent ? Icon.Checkmark : undefined,
    },
  ];
}

function getSubtitle(device: AudioDevice) {
  return Object.entries(TransportType).find(([, v]) => v === device.transportType)?.[0];
}
