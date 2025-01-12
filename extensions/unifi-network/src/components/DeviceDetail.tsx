import { List, Icon, Color } from "@raycast/api";
import { PortConnectorsPretty, type Device, type ListDevice } from "../lib/unifi/types/device";
import type { UnifiClient } from "../lib/unifi/unifi";
import { useDevice } from "../hooks/useDevice";
import { useEffect } from "react";
import { FrequencyColors } from "../lib/colors";

interface DeviceDetailProps {
  deviceData: ListDevice;
  client: UnifiClient;
  devices: ListDevice[];
  isLoading?: boolean;
  onDeviceLoaded?: (device: Device) => void;
}

export default function DeviceDetail({ deviceData, client, devices, onDeviceLoaded }: DeviceDetailProps) {
  const { device, isLoading } = useDevice({
    deviceId: deviceData.id,
    unifi: client,
    devices: devices,
  });

  useEffect(() => {
    if (device) {
      onDeviceLoaded?.(device);
    }
  }, [device]);

  return <List.Item.Detail isLoading={isLoading} metadata={device ? <DeviceMetadata device={device} /> : undefined} />;
}

interface MetadataProps {
  device: Device;
}

export function DeviceMetadata({ device }: MetadataProps) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="IP Address" text={device.ipAddress} />
      <List.Item.Detail.Metadata.Label title="MAC Address" text={device.macAddress} />
      <List.Item.Detail.Metadata.Label title="Model" text={device.model} />

      <List.Item.Detail.Metadata.Label
        title="State"
        text={device.state}
        icon={device.state === "ONLINE" ? Icon.CircleProgress100 : Icon.Circle}
      />

      {device && (
        <>
          <List.Item.Detail.Metadata.Label
            title="Update"
            text={device.firmwareUpdatable ? "Update Available" : "Up to date"}
          />
          <List.Item.Detail.Metadata.Label title="Version" text={device.firmwareVersion} />

          {device.uplink?.deviceId && (
            <List.Item.Detail.Metadata.Label title="Uplink" text={device.uplink.deviceName} />
          )}

          {device.interfaces?.ports?.length && device.state !== "OFFLINE" && (
            <List.Item.Detail.Metadata.TagList title="Ports">
              {device.interfaces.ports.map((port, i) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={i}
                  text={`Port ${port.idx}: ${PortConnectorsPretty[port.connector]}`}
                  color={port.speedMbps ? Color.Green : Color.Red}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}

          {device.interfaces?.radios?.length && device.state !== "OFFLINE" && (
            <List.Item.Detail.Metadata.TagList title="Radios">
              {device.interfaces.radios.map((radio, i) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={i}
                  text={`${radio.frequencyGHz}GHz`}
                  color={FrequencyColors[radio.frequencyGHz]}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}
