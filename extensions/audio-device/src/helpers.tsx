import {
  ActionPanel,
  closeMainWindow,
  Color,
  LocalStorage,
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
import { createDeepLink } from "./utils";
import { usePromise } from "@raycast/utils";

type DeviceListProps = {
  type: "input" | "output";
  deviceId?: string;
};

export function DeviceList({ type, deviceId }: DeviceListProps) {
  const { isLoading, data } = useAudioDevices(type);
  const { data: hiddenDevices, revalidate: refetchHiddenDevices } = usePromise(getHiddenDevices, []);

  const [showHidden, setShowHidden] = useState(false);

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

  const DeviceActions = ({ device }: { device: AudioDevice }) => (
    <>
      <SetAudioDeviceAction device={device} type={type} />
      <Action.CreateQuicklink
        quicklink={{
          name: `Set ${device.isOutput ? "Output" : "Input"} Device to ${device.name}`,
          link: createDeepLink(device.isOutput ? "set-output-device" : "set-input-device", {
            deviceId: device.id,
          }),
        }}
      />
      <Action.CopyToClipboard title="Copy Device Name" content={device.name} shortcut={Keyboard.Shortcut.Common.Copy} />
      <ToggleDeviceVisibilityAction deviceId={device.uid} onAction={refetchHiddenDevices} />
      <Action title="Show Hidden Devices" icon={Icon.Eye} onAction={() => setShowHidden(true)} />
    </>
  );

  return (
    <List isLoading={isLoading}>
      {data &&
        data.devices
          .filter((d) => !hiddenDevices.includes(d.uid))
          .map((d) => {
            const isCurrent = d.uid === data.current.uid;
            return (
              <List.Item
                key={d.uid}
                title={d.name}
                subtitle={getSubtitle(d)}
                icon={getIcon(d, d.uid === data.current.uid)}
                actions={
                  <ActionPanel>
                    <DeviceActions device={d} />
                  </ActionPanel>
                }
                accessories={getAccessories(isCurrent)}
              />
            );
          })}
      {showHidden && data && (
        <List.Section title="Hidden Devices">
          {data.devices
            .filter((d) => hiddenDevices.includes(d.uid))
            .map((d) => (
              <List.Item
                key={d.uid}
                title={d.name}
                subtitle={getSubtitle(d)}
                icon={getIcon(d, false)}
                actions={
                  <ActionPanel>
                    <DeviceActions device={d} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}
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

function ToggleDeviceVisibilityAction({ deviceId, onAction }: { deviceId: string; onAction: () => void }) {
  const { data: isHidden, revalidate: refetchIsHidden } = usePromise(async () => {
    const hiddenDevices = await getHiddenDevices();
    return hiddenDevices.includes(deviceId);
  }, []);

  return (
    <Action
      title={isHidden ? "Show Device" : "Hide Device"}
      icon={isHidden ? Icon.Eye : Icon.EyeDisabled}
      shortcut={null}
      onAction={async () => {
        await toggleDeviceVisibility(deviceId);
        refetchIsHidden();
        onAction();
      }}
    />
  );
}

async function toggleDeviceVisibility(deviceId: string) {
  const hiddenDevices = JSON.parse((await LocalStorage.getItem("hiddenDevices")) || "[]");
  const index = hiddenDevices.indexOf(deviceId);
  if (index === -1) {
    hiddenDevices.push(deviceId);
  } else {
    hiddenDevices.splice(index, 1);
  }
  await LocalStorage.setItem("hiddenDevices", JSON.stringify(hiddenDevices));
}

async function getHiddenDevices() {
  return JSON.parse((await LocalStorage.getItem("hiddenDevices")) || "[]");
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
