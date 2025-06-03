import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { execSync } from "child_process";
import { getFishPath } from "./utils/getFishPath";
import { pluginRegistry } from "./data/registry";

export default function Command() {
  const [plugins, setPlugins] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fishPath = getFishPath();

  useEffect(() => {
    try {
      const result = execSync(`${fishPath} -l -c "fisher list"`, { encoding: "utf-8" });
      const parsed = result
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line !== "jorgebucaran/fisher");
      setPlugins(parsed);
    } catch (err) {
      showFailureToast(err as Error, { title: "Failed to list plugins" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdateAll = () => {
    try {
      execSync(`${fishPath} -l -c "fisher update"`);
      showToast({ style: Toast.Style.Success, title: "All plugins updated" });
    } catch (err) {
      showFailureToast(err as Error, { title: "Failed to update plugins" });
    }
  };

  const handleUpdateOne = (plugin: string) => {
    try {
      execSync(`${fishPath} -l -c "fisher update ${plugin}"`);
      showToast({ style: Toast.Style.Success, title: `Updated ${plugin}` });
    } catch (err) {
      showFailureToast(err as Error, { title: `Failed to update ${plugin}` });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search plugins to update…">
      <List.Item
        key="update-all"
        title="Update All Plugins"
        icon="🔄"
        actions={
          <ActionPanel>
            <Action title="Update All" onAction={handleUpdateAll} />
          </ActionPanel>
        }
      />

      {plugins.map((plugin) => {
        const meta = pluginRegistry.find((p) => p.url.endsWith(plugin));
        return (
          <List.Item
            key={plugin}
            title={plugin}
            subtitle={meta?.description}
            actions={
              <ActionPanel>
                <Action title="Update Plugin" onAction={() => handleUpdateOne(plugin)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
