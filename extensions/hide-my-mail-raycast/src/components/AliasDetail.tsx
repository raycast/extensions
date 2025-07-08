import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { AliasRule } from "../types";
import CreateAlias from "../commands/create-alias";

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
      <List.Item.Detail.Metadata.Label
        title="Description"
        text={alias.name.description || "No description"}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Created" text={alias.createdAt.toLocaleString()} />
      <List.Item.Detail.Metadata.Label
        title="Status"
        text={alias.enabled ? "Enabled" : "Disabled"}
      />
      <List.Item.Detail.Metadata.Label title="Rule ID" text={alias.id} />
    </List.Item.Detail.Metadata>
  );

  return (
    <List.Item.Detail
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Email Address"
            content={alias.email}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.Push
            title="Edit Alias"
            icon={Icon.Pencil}
            target={<CreateAlias alias={alias} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.CopyToClipboard
            title="Copy Forwarding Address"
            content={alias.forwardsToEmail}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Rule ID"
            content={alias.id}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
