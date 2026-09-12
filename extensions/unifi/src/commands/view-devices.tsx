/* eslint-disable @raycast/prefer-title-case */
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
  type LaunchProps,
} from "@raycast/api";
import { memo, useCallback, useEffect, useState } from "react";
import { DeviceDetail } from "../views/DeviceDetail";
import { DeviceLiveStats } from "../views/DeviceLiveStats";
import useDevices from "../hooks/use-devices";
import useUnifi from "../hooks/use-unifi";
import type { Device } from "../lib/unifi/types/device";
import { connectionTypeIcon, getDeviceTypeIcon } from "../lib/utils";
import ViewDevicePorts from "../views/view-device-ports";
import ViewDeviceRadios from "../views/view-device-radios";
import SelectSite from "../select-site";

function ViewDevices(props: LaunchProps) {
  const { client, site, siteIsLoading } = useUnifi();
  const {
    devices,
    isLoading,
    error: deviceErrors,
    searchText,
    setSearchText,
    startPolling,
    stopPolling,
    pollingDeviceId,
  } = useDevices({
    unifi: client,
    search: props.arguments.search,
  });

  const { push } = useNavigation();
  const [error, setError] = useState<Error | null>(null);
  const [pollingToast, setPollingToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (error || deviceErrors) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error?.message ?? deviceErrors?.message,
      });
    }
  }, [error, deviceErrors]);

  const restartDevice = useCallback(
    async (deviceId: string) => {
      if (!client) return;

      try {
        const status = await client.DeviceAction(deviceId, "RESTART");
        if (status) {
          startPolling(deviceId);
        }
      } catch (err) {
        setError(new Error("Failed to restart device"));
        stopPolling();
      }
    },
    [client],
  );

  const startPollingToast = useCallback(async () => {
    setPollingToast(
      await showToast({
        style: Toast.Style.Animated,
        title: "Polling device status",
        message: "Waiting for device to come back online...",
      }),
    );
  }, [pollingToast]);

  const stopPollingToast = useCallback(async () => {
    await pollingToast?.hide();
    setPollingToast(null);
  }, [pollingToast]);

  useEffect(() => {
    if (pollingDeviceId && !pollingToast) {
      startPollingToast();
    } else if (!pollingDeviceId && pollingToast) {
      stopPollingToast();
    }
  }, [pollingDeviceId]);

  const DeviceActions = ({ device }: { device: Device }) => (
    <ActionPanel title={device.name}>
      <Action title="View live stats" onAction={() => push(<DeviceLiveStats device={device} />)} />
      <Action.CopyToClipboard title="Copy IP Address" content={device.ipAddress} />
      <Action.OpenInBrowser title="Open in Browser" url={client?.GetDeviceUrl(device.macAddress) ?? ""} />
      <Action.CopyToClipboard title="Copy MAC Address" content={device.macAddress} />
      {device.interfaces?.ports?.length && (
        <Action
          title="View Ports"
          icon={connectionTypeIcon("WIRED")}
          onAction={() => push(<ViewDevicePorts deviceDetails={device} />)}
        />
      )}
      {device.interfaces?.radios?.length && (
        <Action
          title="View Radios"
          icon={connectionTypeIcon("WIRELESS")}
          onAction={() => push(<ViewDeviceRadios deviceDetails={device} />)}
        />
      )}
      {device.state === "ONLINE" && (
        <Action title="Restart Device" icon={Icon.ArrowClockwise} onAction={() => restartDevice(device.id)} />
      )}
      <Action icon={Icon.Cog} title="Open Command Preferences" onAction={openCommandPreferences} />
    </ActionPanel>
  );

  const renderDeviceItem = useCallback(
    (dev: Device) => (
      <List.Item
        key={dev.id}
        title={dev.name}
        id={dev.id}
        icon={getDeviceTypeIcon(dev)}
        accessories={[
          {
            icon: {
              source: dev.state === "ONLINE" ? Icon.CircleProgress100 : Icon.Circle,
              tintColor: dev.state === "ONLINE" ? Color.Green : Color.Red,
            },
            tooltip: dev.state,
          },
        ]}
        detail={<DeviceDetail device={dev} />}
        actions={<DeviceActions device={dev} />}
      />
    ),
    [client, devices],
  );

  if (!site && !siteIsLoading) {
    return <SelectSite />;
  }

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Devices"
      searchBarPlaceholder="Search devices by name, IP address, or MAC address"
      isShowingDetail
      isLoading={isLoading}
    >
      {devices?.map(renderDeviceItem)}
      {devices.length === 0 && !isLoading && !siteIsLoading && <List.EmptyView title="No devices found" />}
    </List>
  );
}

export default memo(ViewDevices);
