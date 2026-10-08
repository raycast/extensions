import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { pluginRegistry } from "./data/registry";
import PluginDetail from "./components/PluginDetail";
import { listPlugins } from "./utils/listPlugins";
import { showFailureToast } from "@raycast/utils";

export default function SearchPlugins() {
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);
  const [showOnlyUninstalled, setShowOnlyUninstalled] = useState(false);

  useEffect(() => {
    try {
      const allPlugins = listPlugins();
      setInstalledPlugins(allPlugins);
    } catch (error) {
      setInstalledPlugins([]);
      showFailureToast(error as Error, { title: "Failed to list installed plugins" });
    }
  }, []);

  return (
    <List
      searchBarPlaceholder="Search plugins…"
      isLoading={installedPlugins.length === 0}
      isShowingDetail={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={(value) => setShowOnlyUninstalled(value === "uninstalled")}>
          <List.Dropdown.Item title="All Plugins" value="all" />
          <List.Dropdown.Item title="Only Uninstalled" value="uninstalled" />
        </List.Dropdown>
      }
    >
      {pluginRegistry.map((plugin) => {
        const repo = plugin.url.replace("https://github.com/", "");
        const isInstalled = installedPlugins.includes(repo);

        if (showOnlyUninstalled && isInstalled) return null;

        return (
          <List.Item
            key={plugin.name}
            title={plugin.name}
            subtitle={plugin.description}
            icon={{ source: Icon.Box, tintColor: isInstalled ? Color.Green : Color.SecondaryText }}
            accessories={isInstalled ? [{ tag: { value: "Installed", color: Color.Green } }] : []}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  target={
                    <PluginDetail
                      plugin={repo}
                      onRemove={() => setInstalledPlugins((prev) => prev.filter((p) => p !== repo))}
                    />
                  }
                />
                <Action.OpenInBrowser title="Open on GitHub" url={plugin.url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
