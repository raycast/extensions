import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { FrequencyColors } from "../lib/colors";
import { PortConnectorsPretty, type Device } from "../lib/unifi/types/device";
import { format } from "date-fns";

interface DeviceDetailProps {
  device: Device | undefined;
  isLoading?: boolean;
}

const { dateFormat } = getPreferenceValues<Preferences>();

function DeviceDetail({ device, isLoading }: DeviceDetailProps) {
  return (
    <List.Item.Detail
      isLoading={isLoading || !device}
      metadata={device ? <DeviceMetadata device={device} /> : undefined}
    />
  );
}

interface MetadataProps {
  device: Device;
}

function DeviceMetadata({ device }: MetadataProps) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="IP Address" text={device.ipAddress} />
      <List.Item.Detail.Metadata.Label title="MAC Address" text={device.macAddress} />
      <List.Item.Detail.Metadata.Label title="Model" text={device.model} />

      <List.Item.Detail.Metadata.Label
        title="State"
        icon={{
          source: device.state === "ONLINE" ? Icon.CircleProgress100 : Icon.Circle,
          tintColor: device.state === "ONLINE" ? Color.Green : Color.Red,
        }}
        text={device.state === "ONLINE" ? "Online" : device.state === "OFFLINE" ? "Offline" : "Adopting"}
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
            // <List.Item.Detail.Metadata.Link title="Uplink" target={`unifi://devices/${device.uplink.deviceId}`} text={device.uplink.deviceName || ""} />
          )}

          {device.provisionedAt && (
            <List.Item.Detail.Metadata.Label
              title="Provisioned At"
              text={format(new Date(device.provisionedAt), dateFormat)}
            />
          )}

          {device.interfaces?.ports?.length && device.state !== "OFFLINE" && (
            <List.Item.Detail.Metadata.TagList title="Ports">
              {device.interfaces.ports.map((port, i) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={i}
                  text={`${port.idx}: ${PortConnectorsPretty[port.connector]}`}
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

export { DeviceDetail, DeviceMetadata };
