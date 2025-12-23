import { Action, ActionPanel, Icon, List, Toast, showToast, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatMiseError, listInstalledPlugins, uninstallPlugin, MisePlugin } from "./tools/mise";

export default function RemovePluginCommand() {
  const { data, isLoading, error, revalidate } = usePromise(listInstalledPlugins, []);
  const plugins = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter plugins" throttle>
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load plugins"
          description={formatMiseError(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && plugins.length === 0 ? (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="No custom plugins"
          description="Only core plugins are available. Install a plugin first to remove it."
        />
      ) : null}
      {plugins.map((plugin) => (
        <PluginItem key={plugin.name} plugin={plugin} onRefresh={revalidate} />
      ))}
    </List>
  );
}

function PluginItem({ plugin, onRefresh }: { plugin: MisePlugin; onRefresh: () => void }) {
  return (
    <List.Item
      title={plugin.name}
      subtitle={plugin.url}
      icon={{ source: Icon.Plug, tintColor: Color.Purple }}
      actions={
        <ActionPanel>
          <Action
            title="Uninstall Plugin"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              const toast = await showToast({ style: Toast.Style.Animated, title: `Removing ${plugin.name}` });
              try {
                await uninstallPlugin(plugin.name);
                toast.style = Toast.Style.Success;
                toast.title = `Removed ${plugin.name}`;
                toast.message = undefined;
                onRefresh();
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = `Failed to remove ${plugin.name}`;
                toast.message = formatMiseError(error);
              }
            }}
          />
          <ActionPanel.Section title="Copy">
            {plugin.url ? <Action.CopyToClipboard title="Copy Plugin URL" content={plugin.url} /> : null}
            <Action.CopyToClipboard title="Copy Plugin Name" content={plugin.name} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Controls">
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                onRefresh();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
