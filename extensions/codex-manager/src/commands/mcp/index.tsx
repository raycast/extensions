import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  launchCommand,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { McpServer, McpServerDoc } from "@/types";
import { expandTilde, pathExists } from "@/lib/paths";
import { readTomlConfig, writeTomlConfig } from "@/lib/toml";
import { deleteMcpServer, getMcpServers } from "@/lib/mcp";
import { validateMcpServer } from "@/lib/validate";
import { openInEditor } from "@/lib/editor";
import McpForm from "@/commands/mcp/form";
import McpImportForm from "@/commands/mcp/import-form";

function buildCommandSummary(server: McpServer): string {
  const args = Array.isArray(server.args) ? server.args : [];
  return [server.command, ...args].filter(Boolean).join(" ");
}

function McpDetail({ server }: { server: McpServer }) {
  const json = buildMcpJson(server);
  const markdown = `\`\`\`json\n${json}\n\`\`\``;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={json} />
        </ActionPanel>
      }
    />
  );
}

function sanitizeServer(server: McpServer): McpServerDoc {
  return {
    command: server.command,
    args: server.args,
    env: server.env,
    cwd: server.cwd,
    enabled: server.enabled,
    description: server.description,
  };
}

function buildMcpJson(server: McpServer): string {
  const payload = { mcpServers: { [server.name]: sanitizeServer(server) } };
  return JSON.stringify(payload, null, 2);
}

export default function McpServersCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const configPath = expandTilde(preferences.configPath);

  const [servers, setServers] = useState<McpServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [configMissing, setConfigMissing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  async function loadServers() {
    setIsLoading(true);
    setParseError(null);
    try {
      const exists = await pathExists(configPath);
      if (!exists) {
        setConfigMissing(true);
        setServers([]);
        return;
      }
      setConfigMissing(false);

      const { doc } = await readTomlConfig(configPath);
      const docServers = getMcpServers(doc);
      const list = Object.entries(docServers).map(([name, server]) => ({
        name,
        ...server,
      }));
      setServers(list);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadServers();
  }, [configPath]);

  async function handleDelete(server: McpServer) {
    const confirmed = await confirmAlert({
      title: `Delete ${server.name}?`,
      message: "This will remove the MCP server from config.toml.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    try {
      const { doc } = await readTomlConfig(configPath);
      deleteMcpServer(doc, server.name);
      await writeTomlConfig(configPath, doc, preferences.createBackup);
      await showToast({
        style: Toast.Style.Success,
        title: "MCP server deleted",
      });
      await loadServers();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleValidate(server: McpServer) {
    const errors = validateMcpServer(server.name, server);
    if (errors.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "No validation issues",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Validation issues",
      message: errors.join(" "),
    });
  }

  async function handleOpenConfig() {
    await openInEditor(configPath, preferences.editorPreference);
  }

  async function handleCreateConfig() {
    try {
      const doc: Record<string, unknown> = { mcp_servers: {} };
      await writeTomlConfig(configPath, doc, preferences.createBackup);
      await showToast({
        style: Toast.Style.Success,
        title: "Created config.toml",
      });
      await loadServers();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create config",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search MCP servers">
      {configMissing ? (
        <List.EmptyView
          title="config.toml not found"
          description="Create config.toml to start managing MCP servers."
          actions={
            <ActionPanel>
              <Action title="Create Config.toml" onAction={handleCreateConfig} />
              <Action
                title="Open Doctor"
                onAction={() =>
                  launchCommand({
                    name: "doctor",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ) : parseError ? (
        <List.EmptyView
          title="Invalid TOML"
          description={parseError}
          actions={
            <ActionPanel>
              <Action title="Open Config.toml" onAction={handleOpenConfig} />
              <Action
                title="Open Doctor"
                onAction={() =>
                  launchCommand({
                    name: "doctor",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ) : servers.length === 0 ? (
        <List.EmptyView
          title="No MCP servers found"
          description="Add your first MCP server to begin."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add MCP Server"
                icon={Icon.Plus}
                target={<McpForm mode="create" existingNames={[]} onSaved={loadServers} />}
              />
              <Action.Push
                title="Import from JSON"
                icon={Icon.ArrowDownCircle}
                target={<McpImportForm onSaved={loadServers} />}
              />
              <Action title="Open Config.toml" icon={Icon.Document} onAction={handleOpenConfig} />
              <Action
                title="Open Doctor"
                icon={Icon.Heartbeat}
                onAction={() =>
                  launchCommand({
                    name: "doctor",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        servers.map((server) => (
          <List.Item
            key={server.name}
            title={server.name}
            subtitle={buildCommandSummary(server)}
            accessories={[
              { tag: "MCP" },
              {
                icon: server.enabled === false ? Icon.XmarkCircle : Icon.Checkmark,
                tooltip: server.enabled === false ? "Disabled" : "Enabled",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" icon={Icon.Sidebar} target={<McpDetail server={server} />} />
                <Action.CopyToClipboard
                  title="Copy JSON"
                  content={buildMcpJson(server)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={
                    <McpForm
                      mode="edit"
                      initial={server}
                      existingNames={servers.map((item) => item.name)}
                      onSaved={loadServers}
                    />
                  }
                />
                <Action.Push
                  title="Add MCP Server"
                  icon={Icon.Plus}
                  target={
                    <McpForm mode="create" existingNames={servers.map((item) => item.name)} onSaved={loadServers} />
                  }
                />
                <Action.Push
                  title="Import from JSON"
                  icon={Icon.ArrowDownCircle}
                  target={<McpImportForm onSaved={loadServers} />}
                />
                <Action.Push
                  title="Duplicate"
                  icon={Icon.CopyClipboard}
                  target={
                    <McpForm
                      mode="duplicate"
                      initial={server}
                      existingNames={servers.map((item) => item.name)}
                      onSaved={loadServers}
                    />
                  }
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(server)}
                />
                <Action title="Validate" icon={Icon.Check} onAction={() => handleValidate(server)} />
                <Action title="Open Config.toml" icon={Icon.Document} onAction={handleOpenConfig} />
                <Action
                  title="Open Doctor"
                  icon={Icon.Heartbeat}
                  onAction={() =>
                    launchCommand({
                      name: "doctor",
                      type: LaunchType.UserInitiated,
                    })
                  }
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
