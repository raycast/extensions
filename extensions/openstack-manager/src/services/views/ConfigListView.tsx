import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ConfigManager } from "../../config/ConfigManager";
import { CloudConfig } from "../../config/types";
import ConfigFormView from "./ConfigFormView";

interface ConfigListViewProps {
  configManager: ConfigManager;
}

export default function ConfigListView({ configManager }: ConfigListViewProps) {
  const [configs, setConfigs] = useState<CloudConfig[]>([]);
  const [activeConfigName, setActiveConfigName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allConfigs, activeConfig] = await Promise.all([
        configManager.listConfigs(),
        configManager.getActiveConfig(),
      ]);
      setConfigs(allConfigs);
      setActiveConfigName(activeConfig?.name ?? null);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load configs",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [configManager]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleSetActive = useCallback(
    async (name: string) => {
      try {
        await configManager.setActiveConfig(name);
        setActiveConfigName(name);
        await showToast({ style: Toast.Style.Success, title: "Active config set", message: name });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to set active config",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [configManager],
  );

  const handleRemove = useCallback(
    async (name: string) => {
      const confirmed = await confirmAlert({
        title: "Remove Config",
        message: `Are you sure you want to remove "${name}"? This cannot be undone.`,
      });
      if (!confirmed) return;

      try {
        await configManager.removeConfig(name);
        await showToast({ style: Toast.Style.Success, title: "Config removed", message: name });
        await loadConfigs();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to remove config",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [configManager, loadConfigs],
  );

  return (
    <List isLoading={isLoading} navigationTitle="Manage Configs">
      <List.EmptyView
        icon={Icon.Cloud}
        title="No Configs Found"
        description="Add a new OpenStack cloud configuration to get started."
      />
      {configs.map((config) => {
        const isActive = config.name === activeConfigName;
        return (
          <List.Item
            key={config.name}
            icon={isActive ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Cloud}
            title={config.name}
            subtitle={config.auth.auth_url}
            accessories={[
              ...(isActive ? [{ tag: { value: "Active", color: Color.Green } }] : []),
              { text: config.region_name },
            ]}
            actions={
              <ActionPanel>
                <Action title="Set Active" icon={Icon.Star} onAction={() => handleSetActive(config.name)} />
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={<ConfigFormView configManager={configManager} editConfig={config} onSaved={loadConfigs} />}
                />
                <Action.Push
                  title="Add New"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<ConfigFormView configManager={configManager} onSaved={loadConfigs} />}
                />
                <Action
                  title="Remove"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleRemove(config.name)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
