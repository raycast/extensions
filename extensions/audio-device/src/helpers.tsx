import {
  Action,
  ActionPanel,
  Color,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useFrecencySorting, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import {
  type AudioDevice,
  getDefaultInputDevice,
  getDefaultOutputDevice,
  getInputDevices,
  getOutputDevices,
  setDefaultInputDevice,
  setDefaultOutputDevice,
  setDefaultSystemDevice,
  TransportType,
} from "./audio-device";
import { createDeepLink } from "./utils";

type IOType = "input" | "output";

type DeviceListProps = {
  ioType: IOType;
  deviceId?: string;
  deviceName?: string;
};

export function DeviceList({ ioType, deviceId, deviceName }: DeviceListProps) {
  const { isLoading, data } = useAudioDevices(ioType);
  const { data: hiddenDevices } = usePromise(getHiddenDevices, []);
  const { data: showHidden, revalidate: refetchShowHidden } = usePromise(isShowingHiddenDevices, []);

  const { data: sortedDevices, visitItem: recordDeviceSelection } = useFrecencySorting(
    data?.devices?.filter((d) => !hiddenDevices?.includes(d.uid)) || [],
    { key: (device) => device.uid },
  );

  useEffect(() => {
    if ((!deviceId && !deviceName) || !data?.devices) return;

    let device = null;
    if (deviceId) device = data.devices.find((d) => d.id === deviceId);
    if (!device && deviceName) device = data.devices.find((d) => d.name === deviceName);

    if (!device) {
      const searchCriteria = deviceId ? `id ${deviceId}` : `name "${deviceName}"`;
      showToast(Toast.Style.Failure, "Error!", `The device with ${searchCriteria} was not found.`);
      return;
    }

    (async () => {
      try {
        await (ioType === "input" ? setDefaultInputDevice(device.id) : setOutputAndSystemDevice(device.id));
        recordDeviceSelection(device);
        closeMainWindow({ clearRootSearch: true });
        popToRoot({ clearSearchBar: true });
        showHUD(`Active ${ioType} audio device set to ${device.name}`);
      } catch (e) {
        console.log(e);
        showToast(
          Toast.Style.Failure,
          `Error!`,
          `There was an error setting the active ${ioType} audio device to ${device.name}`,
        );
      }
    })();
  }, [deviceId, deviceName, data, ioType, recordDeviceSelection]);

  return (
    <List isLoading={isLoading}>
      {hiddenDevices?.length > 0 && (
        <List.EmptyView
          title="No devices to show"
          description="All devices are hidden. Tap Enter to show hidden devices."
          actions={
            <ActionPanel>
              <ToggleShowHiddenDevicesAction onAction={refetchShowHidden} />
            </ActionPanel>
          }
        />
      )}
      {data &&
        sortedDevices.map((d) => {
          const isCurrent = d.uid === data.current.uid;
          return (
            <List.Item
              key={d.uid}
              title={d.name}
              subtitle={getSubtitle(d)}
              icon={getIcon(d, d.uid === data.current.uid)}
              actions={
                <ActionPanel>
                  <DeviceActions ioType={ioType} device={d} onSelection={() => recordDeviceSelection(d)} />
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
                    <DeviceActions ioType={ioType} device={d} onSelection={() => recordDeviceSelection(d)} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}
    </List>
  );
}

function DeviceActions({
  ioType,
  device,
  onSelection,
}: {
  ioType: IOType;
  device: AudioDevice;
  onSelection: () => void;
}) {
  const { revalidate: refetchHiddenDevices } = usePromise(getHiddenDevices, []);
  const { revalidate: refetchShowHidden } = usePromise(isShowingHiddenDevices, []);

  return (
    <>
      <SetAudioDeviceAction device={device} type={ioType} onSelection={onSelection} />
      <Action.CreateQuicklink
        quicklink={{
          name: `Set ${device.isOutput ? "Output" : "Input"} Device to ${device.name}`,
          link: createDeepLink(device.isOutput ? "set-output-device" : "set-input-device", {
            deviceId: device.id,
            deviceName: device.name,
          }),
        }}
      />
      <Action.CopyToClipboard title="Copy Device Name" content={device.name} shortcut={Keyboard.Shortcut.Common.Copy} />
      <ToggleDeviceVisibilityAction deviceId={device.uid} onAction={refetchHiddenDevices} />

      <ActionPanel.Section title="Options">
        <ToggleShowHiddenDevicesAction onAction={refetchShowHidden} />
      </ActionPanel.Section>
    </>
  );
}

function useAudioDevices(type: IOType) {
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
  type: IOType;
  onSelection?: () => void;
};

function SetAudioDeviceAction({ device, type, onSelection }: SetAudioDeviceActionProps) {
  return (
    <Action
      title={`Set as ${type === "input" ? "Input" : "Output"} Device`}
      icon={{
        source: type === "input" ? "mic.png" : "speaker.png",
        tintColor: Color.PrimaryText,
      }}
      onAction={async () => {
        try {
          await (type === "input" ? setDefaultInputDevice(device.id) : setOutputAndSystemDevice(device.id));
          onSelection?.();
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

function ToggleShowHiddenDevicesAction({ onAction }: { onAction: () => void }) {
  const { data: showHidden, revalidate: refetchShowHidden } = usePromise(async () => {
    return (await LocalStorage.getItem("showHiddenDevices")) === "true";
  }, []);

  return (
    <Action
      title={showHidden ? "Hide Hidden Devices" : "Show Hidden Devices"}
      icon={showHidden ? Icon.EyeDisabled : Icon.Eye}
      onAction={async () => {
        await LocalStorage.setItem("showHiddenDevices", showHidden ? "false" : "true");
        refetchShowHidden();
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

async function isShowingHiddenDevices() {
  return (await LocalStorage.getItem("showHiddenDevices")) === "true";
}

function getDeviceIcon(device: AudioDevice): string | null {
  // Check for AirPlay devices first
  if (device.transportType === TransportType.Airplay) {
    return "airplay.png";
  }

  // Check if it's a Bluetooth device
  if (device.transportType === TransportType.Bluetooth || device.transportType === TransportType.BluetoothLowEnergy) {
    const name = device.name.toLowerCase();
    if (name.includes("airpods max")) {
      return "airpods-max.png";
    } else if (name.includes("airpods pro")) {
      return "airpods-pro.png";
    } else if (name.includes("airpods")) {
      return "airpods.png";
    }
    // If it's Bluetooth but not AirPods, use the bluetooth speaker icon
    return "bluetooth-speaker.png";
  }

  // Not AirPlay or Bluetooth
  return null;
}

function getIcon(device: AudioDevice, isCurrent: boolean) {
  const deviceIcon = getDeviceIcon(device);

  // If it's a special device (AirPods/AirPlay/Bluetooth), show its specific icon
  if (deviceIcon) {
    return {
      source: deviceIcon,
      tintColor: isCurrent ? Color.Green : Color.SecondaryText,
    };
  }

  // For other devices, use the default mic/speaker icons
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
