import { List } from "@raycast/api";
import { Client } from "../lib/unifi/types/client";
import { format } from "date-fns";
import { connectionTypeIcon, dateToHumanReadable } from "../lib/utils";
import { memo } from "react";

interface ClientDetailProps {
  client: Client;
  isLoading: boolean;
}

export function ClientDetail({ client, isLoading }: ClientDetailProps) {
  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="IP Address" text={client.ipAddress} />
          <List.Item.Detail.Metadata.Label title="MAC Address" text={client.macAddress} />
          <List.Item.Detail.Metadata.Label title="Type" text={client.type} icon={connectionTypeIcon(client.type)} />
          <List.Item.Detail.Metadata.Label
            title="Connected At"
            text={format(new Date(client.connectedAt), "yyyy-MM-dd HH:mm:ss")}
          />
          <List.Item.Detail.Metadata.Label title="" text={dateToHumanReadable({ start: client.connectedAt })} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default memo(ClientDetail);
