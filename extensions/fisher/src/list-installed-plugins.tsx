import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import PluginDetail from "./components/PluginDetail";
import { getPluginMeta } from "./utils/getPluginMeta";
import { listPlugins } from "./utils/listPlugins";

export default function Command() {
  const [plugins, setPlugins] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCore, setShowCore] = useState(false);

  useEffect(() => {
    try {
      const allPlugins = listPlugins();
      setPlugins(allPlugins);
    } catch (err) {
      showFailureToast(err as Error, { title: "Could not list plugins" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredPlugins = showCore ? plugins : plugins.slice(1);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={false}
      searchBarPlaceholder="Search plugins…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={(value) => setShowCore(value === "all")}>
          <List.Dropdown.Item title="User Installed Only" value="user" />
          <List.Dropdown.Item title="Include Core Plugins" value="all" />
        </List.Dropdown>
      }
    >
      {filteredPlugins.map((plugin) => {
        const meta = getPluginMeta(plugin);
        const isCore = plugin === "jorgebucaran/fisher";
        const githubUrl = meta?.url ?? `https://github.com/${plugin}`;

        return (
          <List.Item
            key={plugin}
            title={plugin}
            subtitle={meta?.description}
            icon={{ source: Icon.CheckCircle, tintColor: isCore ? Color.Blue : Color.Green }}
            accessories={isCore ? [{ tag: { value: "Core", color: Color.Blue } }] : []}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  target={
                    <PluginDetail
                      plugin={plugin}
                      onRemove={() => setPlugins((prev) => prev.filter((p) => p !== plugin))}
                    />
                  }
                />
                <Action.OpenInBrowser title="Open on GitHub" url={githubUrl} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
