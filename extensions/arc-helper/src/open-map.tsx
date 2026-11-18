import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { MetaForgeUrl } from "./api";
import { MAPS } from "./maps";

export default function OpenMap() {
  return (
    <List searchBarPlaceholder="Select a map to open...">
      {MAPS.map((map) => (
        <List.Item
          key={map.slug}
          icon={map.icon ? { source: map.icon, fallback: Icon.Map } : Icon.Map}
          title={map.name}
          subtitle={map.description}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Interactive Map" url={MetaForgeUrl.map(map.slug)} />
              <Action.CopyToClipboard title="Copy Map URL" content={MetaForgeUrl.map(map.slug)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
