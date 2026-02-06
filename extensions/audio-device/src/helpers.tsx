import {
  Action,
  ActionPanel,
  Color,
  closeMainWindow,
  Icon,
  Keyboard,
  List,
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
  TransportType,
  isWindows,
  getAudioAPI,
} from "./audio-device";
import { setOutputAndSystemDevice } from "./device-actions";
import {
  getHiddenDevices,
  isShowingHiddenDevices,
  setShowHiddenDevices,
  toggleDeviceVisibility,
} from "./device-preferences";
import { getTransportTypeLabel } from "./device-labels";
import { createDeepLink } from "./utils";

type IOType = "input" | "output";

type DeviceListProps = {
  ioType: IOType;
  deviceId?: string;
  deviceName?: string;
};

export function DeviceList({ ioType, deviceId, deviceName }: DeviceListProps) {
  const { isLoading, data } = useAudioDevices(ioType);
  const {
    data: hiddenDevices,
    isLoading: isHiddenLoading,
    revalidate: refetchHiddenDevices,
  } = usePromise(getHiddenDevices, [ioType]);
  const {
    data: showHiddenDevices,
    isLoading: isShowHiddenLoading,
    revalidate: refetchShowHiddenDevices,
  } = usePromise(isShowingHiddenDevices, [ioType]);

  const { data: sortedDevices, visitItem: recordDeviceSelection } = useFrecencySorting(data?.devices || [], {
    key: (device) => device.uid,
  });

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

  const hiddenSet = new Set(hiddenDevices ?? []);
  const shouldShowHidden = showHiddenDevices ?? false;
  const visibleDevices = (sortedDevices ?? []).filter((device) => shouldShowHidden || !hiddenSet.has(device.uid));

  const loading = isLoading || isHiddenLoading || isShowHiddenLoading;
  const showEmptyView = !loading && visibleDevices.length === 0;

  return (
    <List isLoading={loading}>
      {showEmptyView ? (
        <List.EmptyView
          title={shouldShowHidden ? "No devices found" : "No visible devices"}
          description={shouldShowHidden ? undefined : "Hidden devices are not shown. Toggle to manage hidden devices."}
          actions={
            <ActionPanel>
              <ToggleShowHiddenDevicesAction
                ioType={ioType}
                isShowing={shouldShowHidden}
                onToggle={() => void refetchShowHiddenDevices()}
              />
            </ActionPanel>
          }
        />
      ) : (
        data &&
        visibleDevices.map((d) => {
          const isCurrent = d.uid === data.current.uid;
          const isHidden = hiddenSet.has(d.uid);
          return (
            <List.Item
              key={d.uid}
              title={d.name}
              subtitle={getTransportTypeLabel(d)}
              icon={getIcon(d, d.uid === data.current.uid)}
              actions={
                <ActionPanel>
                  <DeviceActions
                    ioType={ioType}
                    device={d}
                    isHidden={isHidden}
                    isShowingHidden={shouldShowHidden}
                    onSelection={() => recordDeviceSelection(d)}
                    onHiddenChange={() => void refetchHiddenDevices()}
                    onShowHiddenChange={() => void refetchShowHiddenDevices()}
                  />
                </ActionPanel>
              }
              accessories={getAccessories(isCurrent, isHidden, shouldShowHidden, d)}
            />
          );
        })
      )}
    </List>
  );
}

function DeviceActions({
  ioType,
  device,
  isHidden,
  isShowingHidden,
  onSelection,
  onHiddenChange,
  onShowHiddenChange,
}: {
  ioType: IOType;
  device: AudioDevice;
  isHidden: boolean;
  isShowingHidden: boolean;
  onSelection: () => void;
  onHiddenChange: () => void;
  onShowHiddenChange: () => void;
}) {
  return (
    <>
      <SetAudioDeviceAction device={device} type={ioType} onSelection={onSelection} />
      {isWindows && <SetCommunicationDeviceAction device={device} type={ioType} onSelection={onSelection} />}
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
      <ToggleHiddenDeviceAction deviceId={device.uid} ioType={ioType} isHidden={isHidden} onAction={onHiddenChange} />
      <ToggleShowHiddenDevicesAction ioType={ioType} isShowing={isShowingHidden} onToggle={onShowHiddenChange} />
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

function SetCommunicationDeviceAction({ device, type, onSelection }: SetAudioDeviceActionProps) {
  return (
    <Action
      title={`Set as ${type === "input" ? "Input" : "Output"} Communication Device`}
      icon={Icon.Phone}
      shortcut={null}
      onAction={async () => {
        try {
          const api = await getAudioAPI();
          if (api.setDefaultCommunicationOutputDevice && api.setDefaultCommunicationInputDevice) {
            if (type === "input") {
              await api.setDefaultCommunicationInputDevice(device.id);
            } else {
              await api.setDefaultCommunicationOutputDevice(device.id);
            }
            onSelection?.();
            closeMainWindow({ clearRootSearch: true });
            popToRoot({ clearSearchBar: true });
            showHUD(`Set "${device.name}" as ${type} communication device`);
          }
        } catch (e) {
          console.log(e);
          showToast(Toast.Style.Failure, `Failed setting "${device.name}" as ${type} communication device`);
        }
      }}
    />
  );
}

function ToggleHiddenDeviceAction({
  deviceId,
  ioType,
  isHidden,
  onAction,
}: {
  deviceId: string;
  ioType: IOType;
  isHidden: boolean;
  onAction: () => void;
}) {
  const title = isHidden ? "Show Device" : "Hide Device";
  const icon = isHidden ? Icon.Eye : Icon.EyeDisabled;

  return (
    <Action
      title={title}
      icon={icon}
      shortcut={null}
      onAction={async () => {
        await toggleDeviceVisibility(ioType, deviceId);
        onAction();
      }}
    />
  );
}

function ToggleShowHiddenDevicesAction({
  ioType,
  isShowing,
  onToggle,
}: {
  ioType: IOType;
  isShowing: boolean;
  onToggle: () => void;
}) {
  return (
    <Action
      title={isShowing ? "Hide Hidden Devices" : "Show Hidden Devices"}
      icon={isShowing ? Icon.EyeDisabled : Icon.Eye}
      onAction={async () => {
        await setShowHiddenDevices(ioType, !isShowing);
        onToggle();
      }}
    />
  );
}

function getDeviceIcon(device: AudioDevice): string | null {
  const name = device.name.toLowerCase();

  // Check for AirPlay devices first
  if (device.transportType === TransportType.Airplay) {
    return "airplay.png";
  }

  // Check if it's a Bluetooth device
  if (device.transportType === TransportType.Bluetooth || device.transportType === TransportType.BluetoothLowEnergy) {
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

  // Windows-specific transport types
  if (isWindows && device.transportType) {
    if (device.transportType === TransportType.Headphones || device.transportType === "headphones") {
      return "bluetooth-speaker.png";
    }
  }

  // Not a special device with custom icon
  return null;
}

export function getIcon(device: AudioDevice, isCurrent: boolean) {
  const deviceIcon = getDeviceIcon(device);

  // If it's a special device (AirPods/AirPlay/Bluetooth/Headphones), show its specific icon
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

function getAccessories(isCurrent: boolean, isHidden: boolean, shouldShowHidden: boolean, device?: AudioDevice) {
  const accessories: List.Item.Accessory[] = [];

  if (isCurrent) {
    accessories.push({ icon: Icon.Checkmark });
  }

  if (shouldShowHidden && isHidden) {
    accessories.push({ icon: Icon.EyeDisabled, tooltip: "Hidden" });
  }

  if (isWindows && device?.isCommunication && !isCurrent) {
    accessories.push({ icon: Icon.Phone, tooltip: "Communication Device" });
  }

  if (isWindows && device && !isCurrent) {
    const deviceType = getSubtitle(device);
    if (deviceType) {
      accessories.push({ text: deviceType });
    }
  }

  return accessories;
}

function getSubtitle(device: AudioDevice) {
  if (!device.transportType) {
    return "";
  }

  if (isWindows) {
    const typeLabels: Record<string, string> = {
      hdmi: "HDMI Output",
      displayport: "DisplayPort",
      usb: "USB Audio",
      bluetooth: "Bluetooth",
      headphones: "Headphones",
      headset: "Headset",
      microphone: "Microphone",
      mic: "Microphone",
      speakers: "Speakers",
      speaker: "Speakers",
      spdif: "Digital (SPDIF/Optical)",
      virtual: "Virtual Device",
      builtin: "Built-in Audio",
    };

    const transportType = device.transportType.toLowerCase();
    return typeLabels[transportType] || device.transportType.charAt(0).toUpperCase() + device.transportType.slice(1);
  }

  return Object.entries(TransportType).find(([, v]) => v === device.transportType)?.[0] || "";
}
