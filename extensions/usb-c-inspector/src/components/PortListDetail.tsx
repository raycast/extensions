import { Color, Icon, List } from "@raycast/api";

import { portDetailFields, portListDetailMarkdown } from "../lib/format";
import type { Port } from "../lib/types";

export function PortListDetail({ port }: { port: Port }) {
  const fields = portDetailFields(port);

  return (
    <List.Item.Detail
      markdown={portListDetailMarkdown(port)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Device Info" />
          <List.Item.Detail.Metadata.Label title="Connected" text={fields.connected} />
          {fields.capabilities ? (
            <List.Item.Detail.Metadata.Label title="Capabilities" text={fields.capabilities} />
          ) : null}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Power Analysis" />
          {fields.powerStatus ? (
            <List.Item.Detail.Metadata.Label
              title="Status"
              text={{
                value: fields.powerStatus,
                color: fields.powerStatusColor,
              }}
              icon={{
                source: Icon.Dot,
                tintColor: fields.powerStatusColor ?? Color.Blue,
              }}
            />
          ) : (
            <List.Item.Detail.Metadata.Label title="Status" text="—" />
          )}
          <List.Item.Detail.Metadata.Label title="Negotiated" text={fields.negotiated ?? "—"} />
          <List.Item.Detail.Metadata.Label
            title="Cable Quality"
            text={fields.cableQuality ?? "—"}
            icon={
              fields.cableQuality?.startsWith("Certified")
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : undefined
            }
          />

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Data Link" />
          <List.Item.Detail.Metadata.Label title="Protocol" text={fields.dataProtocol} />
          <List.Item.Detail.Metadata.Label title="Speed" text={fields.dataSpeed} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
