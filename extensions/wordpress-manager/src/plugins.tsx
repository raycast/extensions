import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { wp, usePlugins, WPPlugin, stripHtml, getStatusIcon, getAdminUrl } from "./utils";

type PluginStatus = "all" | "active" | "inactive";

export default function ManagePlugins() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<PluginStatus>("all");

  const { data: plugins, isLoading, revalidate } = usePlugins();

  // Filter plugins
  const filteredPlugins = plugins?.filter((plugin) => {
    // Status filter
    if (statusFilter !== "all" && plugin.status !== statusFilter) {
      return false;
    }
    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        plugin.name.toLowerCase().includes(search) ||
        plugin.description.raw.toLowerCase().includes(search) ||
        plugin.author.toLowerCase().includes(search)
      );
    }
    return true;
  });

  async function handleToggle(plugin: WPPlugin) {
    const isActivating = plugin.status === "inactive";
    const action = isActivating ? "Activating" : "Deactivating";

    await showToast({
      style: Toast.Style.Animated,
      title: `${action} ${plugin.name}...`,
    });

    try {
      if (isActivating) {
        await wp.activatePlugin(plugin.plugin);
      } else {
        await wp.deactivatePlugin(plugin.plugin);
      }

      await showToast({
        style: Toast.Style.Success,
        title: isActivating ? "Plugin activated" : "Plugin deactivated",
        message: plugin.name,
      });
      revalidate();
    } catch (error) {
      // Error handled by API
    }
  }

  // Group plugins by status
  const activePlugins = filteredPlugins?.filter((p) => p.status === "active") || [];
  const inactivePlugins = filteredPlugins?.filter((p) => p.status === "inactive") || [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search plugins..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as PluginStatus)}
        >
          <List.Dropdown.Item title="All Plugins" value="all" />
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Inactive" value="inactive" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Plug}
        title="No plugins found"
        description={searchText ? "Try a different search term" : "No plugins match the selected filter"}
      />

      {(statusFilter === "all" || statusFilter === "active") && activePlugins.length > 0 && (
        <List.Section title="Active" subtitle={`${activePlugins.length} plugins`}>
          {activePlugins.map((plugin) => (
            <PluginItem key={plugin.plugin} plugin={plugin} onToggle={handleToggle} onRefresh={revalidate} />
          ))}
        </List.Section>
      )}

      {(statusFilter === "all" || statusFilter === "inactive") && inactivePlugins.length > 0 && (
        <List.Section title="Inactive" subtitle={`${inactivePlugins.length} plugins`}>
          {inactivePlugins.map((plugin) => (
            <PluginItem key={plugin.plugin} plugin={plugin} onToggle={handleToggle} onRefresh={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function PluginItem({
  plugin,
  onToggle,
  onRefresh,
}: {
  plugin: WPPlugin;
  onToggle: (plugin: WPPlugin) => void;
  onRefresh: () => void;
}) {
  const statusIcon = getStatusIcon(plugin.status);
  const isActive = plugin.status === "active";

  return (
    <List.Item
      title={plugin.name}
      subtitle={stripHtml(plugin.description.raw).substring(0, 60)}
      icon={statusIcon}
      accessories={[
        { text: `v${plugin.version}`, tooltip: "Version" },
        { text: plugin.author, tooltip: "Author" },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={isActive ? "Deactivate" : "Activate"}
              icon={isActive ? Icon.XMarkCircle : Icon.CheckCircle}
              onAction={() => onToggle(plugin)}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {plugin.plugin_uri && (
              <Action.OpenInBrowser
                title="Plugin Website"
                url={plugin.plugin_uri}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            {plugin.author_uri && <Action.OpenInBrowser title="Author Website" url={plugin.author_uri} />}
            <Action.OpenInBrowser
              title="Manage in Wordpress"
              url={getAdminUrl("plugins.php")}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Plugin Name"
              content={plugin.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Add New Plugin"
              url={getAdminUrl("plugin-install.php")}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
