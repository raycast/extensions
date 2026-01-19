import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { runGCloudCommand } from "./utils";

interface GCloudConfig {
  name: string;
  isActive: boolean;
  account?: string;
  project?: string;
  region?: string;
}

function parseGCloudConfigs(output: string): GCloudConfig[] {
  const lines = output.trim().split("\n");
  const configs: GCloudConfig[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      configs.push({
        name: parts[0],
        isActive: parts[1] === "True",
        account: parts[2] || undefined,
        project: parts[3] || undefined,
        region: parts[4] || undefined,
      });
    }
  }

  return configs;
}

export default function Command() {
  const [configs, setConfigs] = useState<GCloudConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfigs = () => {
    try {
      const output = runGCloudCommand("gcloud config configurations list");
      const parsedConfigs = parseGCloudConfigs(output);
      setConfigs(parsedConfigs);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load configurations",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const activateConfig = async (configName: string) => {
    try {
      runGCloudCommand(`gcloud config configurations activate ${configName}`);
      await showToast({
        style: Toast.Style.Success,
        title: "Configuration activated",
        message: `Switched to ${configName}`,
      });
      loadConfigs();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to activate configuration",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const deleteConfig = async (configName: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Configuration",
      message: `Are you sure you want to delete "${configName}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        runGCloudCommand(
          `gcloud config configurations delete ${configName} --quiet`,
        );
        await showToast({
          style: Toast.Style.Success,
          title: "Configuration deleted",
          message: `Deleted ${configName}`,
        });
        loadConfigs();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete configuration",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  return (
    <List isLoading={isLoading}>
      {configs.map((config) => (
        <List.Item
          key={config.name}
          title={config.name}
          subtitle={config.project || "No project set"}
          accessories={[
            { text: config.account },
            { text: config.region },
            ...(config.isActive
              ? [{ icon: Icon.CheckCircle, tooltip: "Active" }]
              : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title={
                  config.isActive ? "Already Active" : "Activate Configuration"
                }
                icon={Icon.CheckCircle}
                onAction={() => activateConfig(config.name)}
              />
              <Action
                title="Delete Configuration"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteConfig(config.name)}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={loadConfigs}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
