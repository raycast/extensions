import { List } from "@raycast/api";
import { type Client } from "../../api/index.js";
import { formatTimestamp } from "../../utils/formatters.js";

export function ClientDetails({ client }: { client: Client }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={client.name} />
          <List.Item.Detail.Metadata.Label title="Archived" text={client.is_archived ? "Yes" : "No"} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="ID" text={client.id} />
          <List.Item.Detail.Metadata.Label title="Created" text={formatTimestamp(client.created_at)} />
          <List.Item.Detail.Metadata.Label title="Updated" text={formatTimestamp(client.updated_at)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
