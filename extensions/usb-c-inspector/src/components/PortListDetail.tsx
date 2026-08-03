import { List } from "@raycast/api";

import { portListDetailMarkdown } from "../lib/format";
import type { Port } from "../lib/types";

export function PortListDetail({ port }: { port: Port }) {
  const partner = [port.device?.kind, port.device?.vendorName].filter(Boolean).join(" · ");
  const activeTransports = port.transports?.active?.join(", ");

  return (
    <List.Item.Detail
      markdown={portListDetailMarkdown(port)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Status" text={port.status} />
          <List.Item.Detail.Metadata.Label title="Connected" text={port.connectionActive ? "Yes" : "No"} />
          <List.Item.Detail.Metadata.Label title="Headline" text={port.headline} />
          {port.charging ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Charging" text={port.charging.summary} />
            </>
          ) : null}
          {port.dataLink ? <List.Item.Detail.Metadata.Label title="Data" text={port.dataLink.summary} /> : null}
          {port.cable?.speed ? <List.Item.Detail.Metadata.Label title="Cable Speed" text={port.cable.speed} /> : null}
          {port.cable?.maxWatts != null ? (
            <List.Item.Detail.Metadata.Label title="Cable Rating" text={`${port.cable.maxWatts}W`} />
          ) : null}
          {port.cable?.currentRating ? (
            <List.Item.Detail.Metadata.Label title="Current Rating" text={port.cable.currentRating} />
          ) : null}
          {port.trust?.tier ? <List.Item.Detail.Metadata.Label title="Trust Tier" text={port.trust.tier} /> : null}
          {partner ? <List.Item.Detail.Metadata.Label title="Partner" text={partner} /> : null}
          {activeTransports ? (
            <List.Item.Detail.Metadata.Label title="Active Transports" text={activeTransports} />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
