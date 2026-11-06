import { Action, ActionPanel, Grid, Icon, List, openExtensionPreferences } from "@raycast/api";

/**
 * Empty view explaining why a request failed, with a shortcut to the extension preferences.
 */
export function ErrorView({ error, grid = false }: { error: Error; grid?: boolean }) {
  const EmptyView = grid ? Grid.EmptyView : List.EmptyView;

  return (
    <EmptyView
      icon={Icon.Warning}
      title="Could not connect to Strapi"
      description={`${error.message}\nCheck the host and API token in the extension preferences.`}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
