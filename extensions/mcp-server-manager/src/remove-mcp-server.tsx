import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Icon,
  Color,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { EditorManager } from "./services/EditorManager";
import { MCPServerWithMetadata, EditorType } from "./types/mcpServer";
import { getEditorConfig, SUCCESS_MESSAGES } from "./utils/constants";
import ServerDetails from "./server-details";
import {
  isProtectedServer,
  validateLockedServersPresent,
  lockServer,
  unlockServer,
  unlockUserLockedServer,
  isDefaultProtectedServer,
  isServerUnlocked,
} from "./utils/protectedServers";
import { getTransportType } from "./utils/transportUtils";

type EditorFilter = "all" | EditorType;

export default function Command() {
  const [servers, setServers] = useState<MCPServerWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorFilter, setEditorFilter] = useState<EditorFilter>("all");
  const [editorManager] = useState(() => new EditorManager());
  const [protectionRefreshKey, setProtectionRefreshKey] = useState(0);

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    try {
      setIsLoading(true);
      const allServers = await editorManager.readAllServers();
      setServers(allServers);
    } catch (error) {
      console.error("Failed to load servers:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load servers",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleServerLock(server: MCPServerWithMetadata) {
    try {
      const isCurrentlyProtected = await isProtectedServer(
        server.config.name,
        server.editor,
      );
      const isCurrentlyUnlocked = await isServerUnlocked(
        server.config.name,
        server.editor,
      );
      const isCurrentlyLocked = isCurrentlyProtected && !isCurrentlyUnlocked;

      if (isCurrentlyLocked) {
        if (isDefaultProtectedServer(server.config.name)) {
          await unlockServer(server.config.name, server.editor);
        } else {
          await unlockUserLockedServer(server.config.name, server.editor);
        }
        await showToast({
          style: Toast.Style.Success,
          title: "Server Unlocked",
          message: `${server.config.name} can now be edited`,
        });
      } else {
        await lockServer(server.config.name, server.editor);
        await showToast({
          style: Toast.Style.Success,
          title: "Server Locked",
          message: `${server.config.name} is now protected from editing`,
        });
      }

      await loadServers();
      setProtectionRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to toggle server lock:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle server lock",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const filteredServers =
    editorFilter === "all"
      ? servers
      : servers.filter((server) => server.editor === editorFilter);

  const serversByEditor = filteredServers.reduce(
    (acc, server) => {
      if (!acc[server.editor]) {
        acc[server.editor] = [];
      }
      acc[server.editor].push(server);
      return acc;
    },
    {} as Record<EditorType, MCPServerWithMetadata[]>,
  );

  async function handleRemoveServer(server: MCPServerWithMetadata) {
    const isProtected = await isProtectedServer(
      server.config.name,
      server.editor,
    );

    if (isProtected) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot remove protected server",
        message: `${server.config.name} is protected. Please unlock it first before removing.`,
      });
      return;
    }

    const allServers = await editorManager.readAllServers();
    const currentEditorServers = allServers.filter(
      (s) => s.editor === server.editor,
    );
    const currentServerNames = currentEditorServers.map((s) => s.config.name);
    const remainingServerNames = currentEditorServers
      .filter((s) => s.config.name !== server.config.name)
      .map((s) => s.config.name);

    const validation = await validateLockedServersPresent(
      remainingServerNames,
      server.editor,
      currentServerNames,
    );
    if (!validation.isValid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot remove server",
        message: validation.message,
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: `Remove ${server.config.name}?`,
      message: `This will permanently remove the MCP server "${server.config.name}" from your ${getEditorConfig(server.editor).displayName} configuration.`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (confirmed) {
      try {
        await editorManager.deleteServer(
          server.editor,
          server.config.name,
          server.source,
        );

        await showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.SERVER_DELETED,
          message: `${server.config.name} removed from ${getEditorConfig(server.editor).displayName}`,
        });

        await loadServers();
      } catch (error) {
        console.error("Failed to remove server:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to remove server",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  const getTransportIcon = (transport: string) => {
    switch (transport) {
      case "stdio":
        return Icon.Terminal;
      case "sse":
      case "/sse":
        return Icon.Globe;
      case "http":
        return Icon.Network;
      default:
        return Icon.Gear;
    }
  };

  function ServerItem({
    server,
  }: {
    server: MCPServerWithMetadata & {
      isProtected?: boolean;
      isUnlocked?: boolean;
    };
  }) {
    const [isProtected, setIsProtected] = useState(server.isProtected || false);
    const [isUnlocked, setIsUnlocked] = useState(server.isUnlocked || false);

    useEffect(() => {
      async function loadProtectionState() {
        try {
          const [isServerProtected, isServerUnlockedResult] = await Promise.all(
            [
              isProtectedServer(server.config.name, server.editor),
              isServerUnlocked(server.config.name, server.editor),
            ],
          );
          setIsProtected(isServerProtected);
          setIsUnlocked(isServerUnlockedResult);
        } catch (error) {
          console.error(
            "Failed to load protection state for server:",
            server.config.name,
            error,
          );
        }
      }
      loadProtectionState();
    }, [server.config.name, server.editor, protectionRefreshKey]);

    const isLocked = isProtected && !isUnlocked;

    const getStatusDisplay = () => {
      if (server.editor === "cursor") {
        return {
          text: "Enabled",
          icon: Icon.CheckCircle,
          color: Color.Green,
          tooltip: "Server state is managed through Cursor's MCP settings",
        };
      }

      if (server.config.disabled === true) {
        return {
          text: "Disabled",
          icon: Icon.XMarkCircle,
          color: Color.Red,
          tooltip: "Server is disabled",
        };
      } else if (server.config.disabled === false) {
        return {
          text: "Enabled",
          icon: Icon.CheckCircle,
          color: Color.Green,
          tooltip: "Server is enabled",
        };
      } else {
        return {
          text: "Enabled",
          icon: Icon.CheckCircle,
          color: Color.Green,
          tooltip: "Server status unknown",
        };
      }
    };

    const transportIcon = getTransportIcon(getTransportType(server.config));
    const statusDisplay = getStatusDisplay();
    const protectionStatus = isLocked
      ? {
          text: "Protected",
          icon: Icon.Lock,
          color: Color.SecondaryText,
          tooltip:
            "This server is protected from removal. Click unlock to modify.",
        }
      : null;

    return (
      <List.Item
        key={`${server.editor}-${server.config.name}-${server.source}`}
        icon={{
          source: statusDisplay.icon,
          tintColor: statusDisplay.color,
        }}
        title={server.config.name}
        subtitle={server.config.description || getServerCommand(server)}
        accessories={[
          {
            text: {
              value: statusDisplay.text,
              color: statusDisplay.color,
            },
            icon: {
              source: statusDisplay.icon,
              tintColor: statusDisplay.color,
            },
            tooltip: statusDisplay.tooltip,
          },
          ...(protectionStatus
            ? [
                {
                  text: {
                    value: protectionStatus.text,
                    color: protectionStatus.color,
                  },
                  icon: {
                    source: protectionStatus.icon,
                    tintColor: protectionStatus.color,
                  },
                  tooltip: protectionStatus.tooltip,
                },
              ]
            : []),
          {
            text: getTransportType(server.config).toUpperCase() || "UNKNOWN",
            icon: {
              source: transportIcon,
              tintColor: Color.SecondaryText,
            },
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Remove Server"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => handleRemoveServer(server)}
            />
            <Action
              title={isLocked ? "Unlock Server" : "Lock Server"}
              icon={isLocked ? Icon.LockUnlocked : Icon.Lock}
              onAction={() => toggleServerLock(server)}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={
                <ServerDetails
                  arguments={{
                    editorType: server.editor,
                    serverName: server.config.name,
                    configType: server.source as
                      | "global"
                      | "workspace"
                      | "user",
                  }}
                  launchType={LaunchType.UserInitiated}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={loadServers}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search servers to remove..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Editor"
          value={editorFilter}
          onChange={(newValue) => setEditorFilter(newValue as EditorFilter)}
        >
          <List.Dropdown.Item title="All Editors" value="all" />
          <List.Dropdown.Section title="Editors">
            {editorManager.getAvailableEditors().map((editor) => {
              const config = getEditorConfig(editor);
              return (
                <List.Dropdown.Item
                  key={editor}
                  title={config.displayName}
                  value={editor}
                />
              );
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadServers}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {filteredServers.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Servers Found"
          description="No MCP servers found to remove. Only user-configurable servers from your config files are shown here."
          icon={Icon.Trash}
        />
      )}

      {editorFilter === "all"
        ? Object.entries(serversByEditor).map(([editor, editorServers]) => {
            const editorConfig = getEditorConfig(editor as EditorType);
            return (
              <List.Section
                key={editor}
                title={editorConfig.displayName}
                subtitle={`${editorServers.length} server${editorServers.length !== 1 ? "s" : ""}`}
              >
                {editorServers.map((server) => (
                  <ServerItem
                    key={`${server.editor}-${server.config.name}-${server.source}`}
                    server={server}
                  />
                ))}
              </List.Section>
            );
          })
        : filteredServers.map((server) => (
            <ServerItem
              key={`${server.editor}-${server.config.name}-${server.source}`}
              server={server}
            />
          ))}
    </List>
  );
}

function getServerCommand(server: MCPServerWithMetadata): string {
  const transportType = getTransportType(server.config);

  if (transportType === "stdio") {
    return (server.config as { command?: string }).command || "";
  } else if (transportType === "sse" || transportType === "http") {
    return (server.config as { url?: string }).url || "";
  } else if (transportType === "/sse") {
    return (server.config as { serverUrl?: string }).serverUrl || "";
  }
  return "";
}
