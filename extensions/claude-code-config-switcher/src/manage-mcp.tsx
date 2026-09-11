import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { McpServerConfig } from "./types";
import { readClaudeConfig, writeClaudeConfig } from "./utils/config";
import AddMcpServerForm from "./components/AddMcpServerForm";
import EditMcpServerForm from "./components/EditMcpServerForm";

export default function Command() {
  const [servers, setServers] = useState<Record<string, McpServerConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    setIsLoading(true);
    try {
      const config = await readClaudeConfig(preferences.configPath || undefined);
      setServers(config.mcpServers || {});
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load MCP servers",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteServer(serverName: string) {
    const confirmed = await confirmAlert({
      title: "Delete MCP Server",
      message: `Are you sure you want to delete "${serverName}"? This will remove it from your Claude Code configuration.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        const config = await readClaudeConfig(preferences.configPath || undefined);
        const mcpServers = { ...config.mcpServers };
        delete mcpServers[serverName];

        await writeClaudeConfig(
          {
            ...config,
            mcpServers,
          },
          preferences.configPath || undefined
        );

        showToast({
          style: Toast.Style.Success,
          title: "Server Deleted",
          message: `Deleted ${serverName}`,
        });

        await loadServers();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete server",
          message: (error as Error).message,
        });
      }
    }
  }

  async function handleToggleServer(serverName: string, currentlyDisabled: boolean) {
    try {
      const config = await readClaudeConfig(preferences.configPath || undefined);
      const mcpServers = { ...config.mcpServers };

      if (mcpServers[serverName]) {
        mcpServers[serverName] = {
          ...mcpServers[serverName],
          disabled: !currentlyDisabled,
        };
      }

      await writeClaudeConfig(
        {
          ...config,
          mcpServers,
        },
        preferences.configPath || undefined
      );

      showToast({
        style: Toast.Style.Success,
        title: currentlyDisabled ? "Server Enabled" : "Server Disabled",
        message: serverName,
      });

      await loadServers();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle server",
        message: (error as Error).message,
      });
    }
  }

  const serverEntries = Object.entries(servers);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search MCP servers...">
      <List.Section title="MCP Servers" subtitle={`${serverEntries.length} servers`}>
        {serverEntries.map(([name, config]) => {
          const isDisabled = config.disabled || false;
          const transportType = config.transportType || "stdio";

          return (
            <List.Item
              key={name}
              title={name}
              subtitle={config.command}
              accessories={[
                { tag: { value: transportType.toUpperCase(), color: Color.Blue } },
                isDisabled
                  ? { tag: { value: "Disabled", color: Color.Red }, icon: Icon.XMarkCircle }
                  : { tag: { value: "Enabled", color: Color.Green }, icon: Icon.CheckCircle },
              ]}
              icon={{ source: Icon.Gear, tintColor: isDisabled ? Color.SecondaryText : Color.Blue }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Server Actions">
                    <Action
                      title={isDisabled ? "Enable Server" : "Disable Server"}
                      icon={isDisabled ? Icon.CheckCircle : Icon.XMarkCircle}
                      onAction={() => handleToggleServer(name, isDisabled)}
                    />
                    <Action
                      title="Edit Server"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() =>
                        push(<EditMcpServerForm serverName={name} config={config} onUpdate={loadServers} />)
                      }
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Dangerous Actions">
                    <Action
                      title="Delete Server"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDeleteServer(name)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {serverEntries.length === 0 && !isLoading && (
        <List.EmptyView
          title="No MCP Servers"
          description="Add your first MCP server to get started"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action
                title="Add Server"
                icon={Icon.Plus}
                onAction={() => push(<AddMcpServerForm onSuccess={loadServers} />)}
              />
            </ActionPanel>
          }
        />
      )}

      <List.Section title="Actions">
        <List.Item
          title="Add New MCP Server"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Add Server"
                icon={Icon.Plus}
                onAction={() => push(<AddMcpServerForm onSuccess={loadServers} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
