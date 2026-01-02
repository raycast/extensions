import {
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  closeMainWindow,
  openCommandPreferences,
} from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { resolve } from "node:path";

const execAsync = promisify(exec);

interface MCPClient {
  id: string;
  name: string;
  icon: Icon;
  docUrl?: string;
}

type MCPClientWithPath = MCPClient & {
  filePath: string;
  expandedPath?: string;
};

const MCP_CLIENTS: MCPClient[] = [
  {
    id: "amp",
    name: "Amp",
    icon: Icon.Terminal,
    docUrl: "https://ampcode.com/manual#mcp",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    icon: Icon.Terminal,
    docUrl: "https://code.claude.com/docs/en/mcp",
  },
  {
    id: "claude-desktop-app",
    name: "Claude Desktop",
    icon: Icon.AppWindow,
    docUrl: "https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop",
  },
  {
    id: "cline",
    name: "Cline",
    icon: Icon.AppWindow,
    docUrl: "https://docs.cline.bot/mcp/configuring-mcp-servers",
  },
  {
    id: "codex",
    name: "Codex",
    icon: Icon.Terminal,
    docUrl: "https://developers.openai.com/codex/mcp/",
  },
  { id: "copilot-cli", name: "Copilot CLI", icon: Icon.Terminal },
  {
    id: "copilot-vscode",
    name: "Copilot / VS Code",
    icon: Icon.AppWindow,
    docUrl: "https://code.visualstudio.com/docs/copilot/customization/mcp-servers",
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: Icon.AppWindow,
    docUrl: "https://cursor.com/docs/context/mcp",
  },
  {
    id: "cursor-cli",
    name: "Cursor CLI",
    icon: Icon.Terminal,
    docUrl: "https://cursor.com/docs/context/mcp",
  },
  {
    id: "factory-cli",
    name: "Factory CLI",
    icon: Icon.Terminal,
    docUrl: "https://docs.factory.ai/cli/configuration/mcp",
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    icon: Icon.Terminal,
    docUrl: "https://geminicli.com/docs/tools/mcp-server/",
  },
  {
    id: "jetbrains",
    name: "JetBrains AI Assistant",
    icon: Icon.AppWindow,
    docUrl: "https://www.jetbrains.com/help/ai-assistant/mcp.html",
  },
  {
    id: "opencode",
    name: "OpenCode",
    icon: Icon.Terminal,
    docUrl: "https://opencode.ai/docs/mcp-servers",
  },
  {
    id: "kiro",
    name: "Kiro",
    icon: Icon.AppWindow,
    docUrl: "https://kiro.dev/docs/mcp/configuration/",
  },
  {
    id: "qoder",
    name: "Qoder",
    icon: Icon.AppWindow,
    docUrl: "https://docs.qoder.com/user-guide/chat/model-context-protocol",
  },
  {
    id: "visual-studio",
    name: "Visual Studio",
    icon: Icon.AppWindow,
    docUrl: "https://learn.microsoft.com/en-us/visualstudio/ide/mcp-servers",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    icon: Icon.AppWindow,
    docUrl: "https://docs.windsurf.com/windsurf/cascade/mcp",
  },
];

function expandPath(filePath: string): string {
  const trimmedPath = filePath.trim();

  if (trimmedPath.startsWith("~/")) {
    return resolve(homedir(), trimmedPath.slice(2));
  }

  if (trimmedPath.startsWith("~")) {
    return resolve(homedir(), trimmedPath.slice(1));
  }

  return resolve(trimmedPath);
}

function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function getPreferenceKey(clientId: string, suffix: string): string {
  const camelCaseId = toCamelCase(clientId);
  return `${camelCaseId}${suffix}`;
}

async function openInCursor(client: MCPClientWithPath) {
  try {
    const expandedPath = ensureConfiguredPath(client);
    await execAsync(`open -a "Cursor" "${expandedPath}"`);
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Cursor",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function openInVSCode(client: MCPClientWithPath) {
  try {
    const expandedPath = ensureConfiguredPath(client);
    await execAsync(`open -a "Visual Studio Code" "${expandedPath}"`);
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in VS Code",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function openInZed(client: MCPClientWithPath) {
  try {
    const expandedPath = ensureConfiguredPath(client);
    await execAsync(`open -a "Zed" "${expandedPath}"`);
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Zed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function openInSublime(client: MCPClientWithPath) {
  try {
    const expandedPath = ensureConfiguredPath(client);
    await execAsync(`open -a "Sublime Text" "${expandedPath}"`);
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Sublime Text",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function ensureConfiguredPath(client: MCPClientWithPath): string {
  if (!client.filePath) {
    throw new Error(`Set the config path for ${client.name} in extension preferences.`);
  }

  if (client.expandedPath) {
    return client.expandedPath;
  }

  return expandPath(client.filePath);
}

type Preferences = {
  [key: string]: boolean | string | undefined;
};

function getDefaultAction(client: MCPClientWithPath, preferences: Preferences) {
  const defaultEditor = String(preferences.defaultEditor || "cursor").toLowerCase();

  if (defaultEditor === "cursor" && preferences.showCursorAction !== false) {
    return <Action title="Open in Cursor" icon={Icon.AppWindow} onAction={() => openInCursor(client)} />;
  }

  if (defaultEditor === "vscode" && preferences.showVsCodeAction !== false) {
    return <Action title="Open in VS Code" icon={Icon.AppWindow} onAction={() => openInVSCode(client)} />;
  }

  if (defaultEditor === "zed" && preferences.showZedAction !== false) {
    return <Action title="Open in Zed" icon={Icon.AppWindow} onAction={() => openInZed(client)} />;
  }

  if (defaultEditor === "sublime" && preferences.showSublimeAction !== false) {
    return <Action title="Open in Sublime Text" icon={Icon.AppWindow} onAction={() => openInSublime(client)} />;
  }

  // Fallback to Cursor if default editor is not available
  if (preferences.showCursorAction !== false) {
    return <Action title="Open in Cursor" icon={Icon.AppWindow} onAction={() => openInCursor(client)} />;
  }

  return null;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  // Filter clients based on visibility preferences
  const visibleClients = MCP_CLIENTS.filter((client) => {
    const camelCaseId = toCamelCase(client.id);
    const showKey = `show${camelCaseId.charAt(0).toUpperCase()}${camelCaseId.slice(1)}`;
    return preferences[showKey] !== false; // Default to true if not set
  });

  // Get file path for each client (from preferences or default)
  const clientsWithPaths: MCPClientWithPath[] = visibleClients.map((client) => {
    const pathKey = getPreferenceKey(client.id, "Path");
    const customPath = preferences[pathKey];
    const filePath = typeof customPath === "string" ? customPath.trim() : "";
    const expandedPath = filePath ? expandPath(filePath) : undefined;
    return {
      ...client,
      filePath,
      expandedPath,
    };
  });

  return (
    <List searchBarPlaceholder="Search MCP configurations...">
      {clientsWithPaths.map((client) => {
        const defaultAction = getDefaultAction(client, preferences);
        return (
          <List.Item
            key={client.id}
            icon={client.icon}
            title={client.name}
            subtitle={client.filePath || "Set path in extension preferences"}
            actions={
              <ActionPanel>
                {defaultAction}
                {client.docUrl && (
                  <Action.OpenInBrowser title="Open Documentation" icon={Icon.Book} url={client.docUrl} />
                )}
                <ActionPanel.Section title="File Actions">
                  {client.expandedPath ? (
                    <>
                      <Action.CopyToClipboard
                        title="Copy File Path"
                        content={client.filePath}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.ShowInFinder path={client.expandedPath} shortcut={{ modifiers: ["cmd"], key: "f" }} />
                    </>
                  ) : (
                    <Action
                      title="Set Path"
                      icon={Icon.Gear}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => openCommandPreferences()}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Open in Editor">
                  {preferences.showCursorAction !== false && preferences.defaultEditor !== "cursor" && (
                    <Action
                      title="Open in Cursor"
                      icon={Icon.AppWindow}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={() => openInCursor(client)}
                    />
                  )}
                  {preferences.showVsCodeAction !== false && preferences.defaultEditor !== "vscode" && (
                    <Action
                      title="Open in VS Code"
                      icon={Icon.AppWindow}
                      shortcut={{ modifiers: ["cmd"], key: "v" }}
                      onAction={() => openInVSCode(client)}
                    />
                  )}
                  {preferences.showZedAction !== false && preferences.defaultEditor !== "zed" && (
                    <Action
                      title="Open in Zed"
                      icon={Icon.AppWindow}
                      shortcut={{ modifiers: ["cmd"], key: "z" }}
                      onAction={() => openInZed(client)}
                    />
                  )}
                  {preferences.showSublimeAction !== false && preferences.defaultEditor !== "sublime" && (
                    <Action
                      title="Open in Sublime Text"
                      icon={Icon.AppWindow}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => openInSublime(client)}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
