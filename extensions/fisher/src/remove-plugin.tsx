import { List, ActionPanel, Action, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { execSync } from "child_process";
import { getFishPath } from "./utils/getFishPath";
import { getPluginMeta } from "./utils/getPluginMeta";
import { listPlugins } from "./utils/listPlugins";

export default function Command() {
  const [plugins, setPlugins] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fishPath = getFishPath();

  useEffect(() => {
    try {
      const allPlugins = listPlugins();
      const filteredPlugins = allPlugins.filter((plugin) => plugin !== "jorgebucaran/fisher");
      setPlugins(filteredPlugins);
    } catch (err) {
      showFailureToast(err as Error, { title: "Failed to list plugins" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRemove = async (plugin: string) => {
    const confirmed = await confirmAlert({
      title: `Remove ${plugin}?`,
      message: "Are you sure you want to remove this plugin?",
      primaryAction: {
        title: "Remove Plugin",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          try {
            execSync(`${fishPath} -l -c "fisher remove ${plugin}"`);
            await showToast({ style: Toast.Style.Success, title: `Removed ${plugin}` });
            setPlugins((prev) => prev.filter((p) => p !== plugin));
          } catch (err) {
            showFailureToast(err as Error, { title: `Failed to remove ${plugin}` });
          }
        },
      },
    });

    if (!confirmed) {
      await showToast({ style: Toast.Style.Failure, title: "Cancelled" });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search plugins to remove…">
      {plugins.map((plugin) => {
        const meta = getPluginMeta(plugin);

        return (
          <List.Item
            key={plugin}
            title={plugin}
            subtitle={meta?.description}
            actions={
              <ActionPanel>
                <Action title="Remove Plugin" style={Action.Style.Destructive} onAction={() => handleRemove(plugin)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
