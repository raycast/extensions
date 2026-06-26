// src/device-list.tsx
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Device, DeviceType, getDevices, setDevice } from "./audio";

const NOUN: Record<DeviceType, string> = {
  input: "Input Device",
  output: "Output Device",
};

const TYPE_ICON: Record<DeviceType, Icon> = {
  input: Icon.Microphone,
  output: Icon.SpeakerHigh,
};

export default function DeviceList(props: { type: DeviceType }) {
  const { type } = props;
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      setDevices(await getDevices(type));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to load ${NOUN[type].toLowerCase()}s`,
        message: error instanceof Error ? error.message : String(error),
      });
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Load once on mount; `type` is fixed for a command's lifetime.
  useEffect(() => {
    load();
  }, []);

  async function select(device: Device) {
    if (device.isCurrent) {
      await closeMainWindow();
      return;
    }
    try {
      await setDevice(type, device.id);
      setDevices((prev) =>
        prev.map((d) => ({ ...d, isCurrent: d.id === device.id })),
      );
      await showToast({
        style: Toast.Style.Success,
        title: `Now using: ${device.name}`,
      });
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not switch ${NOUN[type].toLowerCase()}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Switch ${NOUN[type].toLowerCase()}…`}
    >
      {devices.map((device) => (
        <List.Item
          key={device.id}
          title={device.name}
          icon={TYPE_ICON[type]}
          accessories={
            device.isCurrent
              ? [
                  {
                    icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                    tag: "Current",
                  },
                ]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title={
                  device.isCurrent
                    ? `${device.name} (Current)`
                    : `Switch to ${device.name}`
                }
                onAction={() => select(device)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
