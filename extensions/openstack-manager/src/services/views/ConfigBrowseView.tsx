import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ConfigManager } from "../../config/ConfigManager";
import { CloudConfig } from "../../config/types";
import { ResourceCache } from "../../core/ResourceCache";
import ServiceListView from "./ServiceListView";

interface ConfigBrowseViewProps {
  configManager: ConfigManager;
  cache: ResourceCache;
  binaryPath: string;
}

export default function ConfigBrowseView({ configManager, cache, binaryPath }: ConfigBrowseViewProps) {
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

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search configs..." navigationTitle="Search OpenStack Resources">
      <List.EmptyView
        icon={Icon.Cloud}
        title="No Configs Found"
        description="Add a cloud configuration via Manage Configs to get started."
      />
      {configs.map((config) => {
        const isActive = config.name === activeConfigName;
        return (
          <List.Item
            key={config.name}
            icon={isActive ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Cloud}
            title={config.name}
            subtitle={config.auth.auth_url}
            accessories={[{ text: config.region_name }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse Services"
                  icon={Icon.List}
                  target={
                    <ServiceListView
                      configName={config.name}
                      horizonUrl={config.horizon_url}
                      binaryPath={binaryPath}
                      cache={cache}
                      configManager={configManager}
                    />
                  }
                />
                <Action
                  title="Set Active"
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  onAction={() => handleSetActive(config.name)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
