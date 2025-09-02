import { Action, ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getConfigOptions,
  ClaudeCodeConfig,
  getCurrentConfig,
  updateEnvironmentVariables,
  isConfigActive,
  execAsync,
} from "./utils";

export default function Command() {
  const [configOptions, setConfigOptions] = useState<ClaudeCodeConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<Partial<ClaudeCodeConfig> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadConfigs() {
      try {
        const options = getConfigOptions();
        setConfigOptions(options);

        const config = await getCurrentConfig();
        setCurrentConfig(config);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load configurations",
          message: "Check your JSON configuration format",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadConfigs();
  }, []);

  const handleSelectConfig = async (config: ClaudeCodeConfig) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating configuration...",
      message: config.alias,
    });

    try {
      await updateEnvironmentVariables(config);
      setCurrentConfig(config);

      toast.style = Toast.Style.Success;
      toast.title = "Configuration updated!";
      toast.message = `${config.emoji} ${config.alias} is now active`;
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update configuration";
    }
  };

  const handleReloadShell = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Applying environment...",
    });

    try {
      // Apply the environment configuration
      await execAsync(`source ~/.claude-code-env`);
      toast.style = Toast.Style.Success;
      toast.title = "Environment applied!";
      toast.message = "Current shell session now uses the selected configuration";
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to apply environment";
      toast.message = "Run 'source ~/.claude-code-env' manually";
    }
  };

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title="No Configurations"
        description="Add Anthropic configurations to get started"
        icon={Icon.Gear}
      />

      {configOptions.map((config, index) => {
        const active = isConfigActive(config, currentConfig);

        return (
          <List.Item
            key={index}
            icon={config.emoji}
            title={config.alias}
            subtitle={`${config.ANTHROPIC_MODEL} • ${config.ANTHROPIC_BASE_URL}`}
            accessories={[
              {
                text: active ? "Active" : "",
                icon: active ? Icon.Checkmark : undefined,
                tooltip: active ? "Currently active configuration" : "Click to activate",
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Select Configuration" icon={Icon.Gear} onAction={() => handleSelectConfig(config)} />
                  {active && (
                    <Action
                      title="Reload Shell"
                      icon={Icon.RotateClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={handleReloadShell}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Base URL"
                    content={config.ANTHROPIC_BASE_URL}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Model Name"
                    content={config.ANTHROPIC_MODEL}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Token"
                    content={config.ANTHROPIC_AUTH_TOKEN}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Source Command"
                    content="source ~/.claude-code-env"
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
