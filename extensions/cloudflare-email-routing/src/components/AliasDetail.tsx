import { List } from "@raycast/api";
import { AliasRule } from "../types";

interface AliasDetailProps {
  alias: AliasRule;
}

export function AliasDetail({ alias }: AliasDetailProps) {
  const metadata = (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Email Address" text={alias.email} />
      <List.Item.Detail.Metadata.Label title="Forwards To" text={alias.forwardsToEmail} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Label" text={alias.name.label || "No label"} />
      <List.Item.Detail.Metadata.Label title="Description" text={alias.name.description || "No description"} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Created" text={alias.createdAt.toLocaleString()} />
      <List.Item.Detail.Metadata.Label title="Status" text={alias.enabled ? "Enabled" : "Disabled"} />
      <List.Item.Detail.Metadata.Label title="Rule ID" text={alias.id} />
    </List.Item.Detail.Metadata>
  );

  return <List.Item.Detail metadata={metadata} />;
}
