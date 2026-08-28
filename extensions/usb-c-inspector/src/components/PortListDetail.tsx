import { Color, Icon, List } from "@raycast/api";

import { heroTitle, portDetailFields, statusTagColor } from "../lib/format";
import type { Port } from "../lib/types";

/**
 * Metadata-only detail pane.
 * Mixing markdown + metadata forces a tall empty markdown band above the facts;
 * keeping everything in Metadata moves Status/Connected/… flush to the top.
 */
export function PortListDetail({ port }: { port: Port }) {
  const fields = portDetailFields(port);
  const statusColor = statusTagColor(port);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={heroTitle(port)} color={statusColor} />
          </List.Item.Detail.Metadata.TagList>

          {port.subtitle ? <List.Item.Detail.Metadata.Label title="Summary" text={port.subtitle} /> : null}

          {fields.deviceNames.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Connected Devices">
              {fields.deviceNames.map((name) => (
                <List.Item.Detail.Metadata.TagList.Item key={name} text={name} color={Color.Purple} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Connected" text={fields.connected} icon={Icon.Plug} />
          {fields.capabilities ? (
            <List.Item.Detail.Metadata.Label title="Capabilities" text={fields.capabilities} icon={Icon.ComputerChip} />
          ) : null}

          <List.Item.Detail.Metadata.Separator />

          {fields.powerStatus ? (
            <List.Item.Detail.Metadata.Label
              title="Power"
              text={{ value: fields.powerStatus, color: fields.powerStatusColor }}
              icon={{ source: Icon.Bolt, tintColor: fields.powerStatusColor ?? Color.SecondaryText }}
            />
          ) : null}
          {fields.negotiated ? (
            <List.Item.Detail.Metadata.Label title="Negotiated" text={fields.negotiated} icon={Icon.Gauge} />
          ) : null}
          {fields.cableQuality ? (
            <List.Item.Detail.Metadata.Label
              title="Cable"
              text={fields.cableQuality}
              icon={
                fields.cableQuality.startsWith("Certified")
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : Icon.BarCode
              }
            />
          ) : null}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Protocol" text={fields.dataProtocol} icon={Icon.Link} />
          <List.Item.Detail.Metadata.Label title="Speed" text={fields.dataSpeed} icon={Icon.Heartbeat} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
