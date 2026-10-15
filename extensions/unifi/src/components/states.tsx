import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import SelectSite from "../select-site";

export function MissingSite() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Globe}
        title="Select a Network site"
        description="Choose the site that Network commands and AI tools should use."
        actions={
          <ActionPanel>
            <Action.Push title="Select Site" target={<SelectSite />} />
            <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export function ResourceError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title="Could not load UniFi"
        description={error.message}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
            <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
