import { Color, Icon, List } from "@raycast/api";
import { PortConnectorsPretty, type Device } from "../lib/unifi/types/device";
import { formatSpeed } from "../lib/utils";
import { PORT_SPEED_COLORS } from "../lib/colors";

export default function ViewDevicePorts({ deviceDetails }: { deviceDetails: Device }) {
  return (
    <List navigationTitle={`Search ports for ${deviceDetails.name}`} searchBarPlaceholder="Search through device ports">
      {deviceDetails?.interfaces?.ports?.map((port) => (
        <List.Item
          key={port.idx}
          title={`Port ${port.idx}`}
          keywords={[
            `Port ${port.idx}`,
            PortConnectorsPretty[port.connector],
            port.state,
            port?.speedMbps ? port?.speedMbps?.toString() : "",
          ]}
          accessories={[
            {
              tooltip: "Max Speed",
              tag: { value: formatSpeed(port.maxSpeedMbps), color: PORT_SPEED_COLORS[port.maxSpeedMbps] },
            },
            {
              tooltip: "Status: " + port.speedMbps,
              tag: {
                value: port.speedMbps ? formatSpeed(port.speedMbps) : "Inactive",
                color: port.speedMbps ? PORT_SPEED_COLORS[port.speedMbps] : Color.Red,
              },
            },
            { tooltip: "Connector", text: `${PortConnectorsPretty[port.connector]}` },
            {
              tooltip: "State: " + port.state,
              icon: port.state === "UP" ? Icon.ArrowUp : port.state === "DOWN" ? Icon.ArrowDown : Icon.QuestionMark,
            },
          ]}
        />
      ))}
    </List>
  );
}
