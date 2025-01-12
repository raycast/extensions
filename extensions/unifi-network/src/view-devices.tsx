/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import DeviceDetail from "./components/DeviceDetail";
import { useDevices } from "./hooks/useDevices";
import { useInterval } from "./hooks/useInterval";
import { useUnifi } from "./hooks/useUnifi";
import { connectionTypeIcon } from "./lib/utils";
import ViewDevicePorts from "./view-device-ports";
import ViewDeviceRadios from "./view-device-radios";
import type { Device } from "./lib/unifi/types/device";

export default function ViewDevices() {
  const { client } = useUnifi();
  const {
    devices,
    isLoading,
    error: deviceErrors,
    setSearchText,
    revalidate,
    lookupDevice,
  } = useDevices({
    unifi: client,
  });
  const { push } = useNavigation();
  const [pollingForDevice, setPollingForDevice] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [device, setDevice] = useState<Device>();

  useEffect(() => {
    if (error || deviceErrors) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error?.message ?? deviceErrors?.message,
      });
    }
  }, [error, deviceErrors]);

  useInterval(
    () => {
      console.log("Poll for restarted device state: ", pollingForDevice);
      revalidate();
      if (pollingForDevice) {
        isDeviceReady(pollingForDevice).then((ready) => {
          if (ready) {
            console.log("Device is ready");
            setPollingForDevice(null);
          }
        });
      }
    },
    pollingForDevice ? 5000 : null,
  );

  const isDeviceReady = async (id: string): Promise<boolean> => {
    const device = lookupDevice(id);
    if (!device) {
      console.log("Device not found");
      return true;
    }

    return device?.state === "ONLINE";
  };

  const restartDevice = async (deviceId: string) => {
    if (!client) {
      return;
    }

    console.log("Restarting device", deviceId);

    const status = await client.DeviceAction(deviceId, "RESTART");
    if (status) {
      console.log("Device restarted");
      revalidate();
      setPollingForDevice(deviceId);
    } else {
      console.error("Failed to restart device");
      setError(new Error("Failed to restart device"));
    }
  };

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Devices"
      searchBarPlaceholder="Search devices by name, IP address, or MAC address"
      isShowingDetail
      isLoading={isLoading}
    >
      {!devices?.length && <List.Section title="None found..." />}
      {devices?.map((dev) => (
        <List.Item
          key={dev.id}
          title={dev.name}
          accessories={[{ icon: dev.state === "ONLINE" ? Icon.CircleProgress100 : Icon.Circle, tooltip: dev.state }]}
          detail={
            <DeviceDetail deviceData={dev} client={client} devices={devices} onDeviceLoaded={(dev) => setDevice(dev)} />
          }
          actions={
            device && (
              <ActionPanel title={device.name}>
                <Action.CopyToClipboard title="Copy IP Address" content={device.ipAddress} />
                {device.interfaces?.ports?.length && (
                  <Action
                    title="View Ports"
                    icon={connectionTypeIcon("WIRED")}
                    onAction={() => push(<ViewDevicePorts deviceDetails={device} />)}
                  />
                )}
                {device.interfaces?.radios?.length && (
                  <Action
                    title="View Ports"
                    icon={connectionTypeIcon("WIRELESS")}
                    onAction={() => push(<ViewDeviceRadios deviceDetails={device} />)}
                  />
                )}
                <Action.CopyToClipboard title="Copy MAC Address" content={device.macAddress} />
                {device.state === "ONLINE" && (
                  <Action title="Restart Device" icon={Icon.ArrowClockwise} onAction={() => restartDevice(device.id)} />
                )}
                <Action title="Revalidate" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
              </ActionPanel>
            )
          }
        />
      ))}
      {devices.length === 0 && !isLoading && <List.EmptyView title="No devices found" />}
    </List>
  );
}
