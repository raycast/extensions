import { List, ActionPanel, Action, Icon, Color, showToast, Toast, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  loadHopConfig,
  loadHistory,
  buildSSHCommand,
  getTerminalApp,
  Connection,
  LoadConfigResult,
} from "./utils/config";

interface ConnectionWithHistory extends Connection {
  lastUsed?: Date;
  useCount?: number;
}

export default function Command() {
  const [connections, setConnections] = useState<ConnectionWithHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const result: LoadConfigResult = loadHopConfig();
      const history = loadHistory();

      // Merge history data with connections
      const connectionsWithHistory: ConnectionWithHistory[] = result.connections.map((conn) => {
        const historyEntry = history.get(conn.id);
        return {
          ...conn,
          lastUsed: historyEntry?.last_used ? new Date(historyEntry.last_used) : undefined,
          useCount: historyEntry?.use_count,
        };
      });

      // Sort by last used (recent first), then by id
      connectionsWithHistory.sort((a, b) => {
        if (a.lastUsed && b.lastUsed) {
          return b.lastUsed.getTime() - a.lastUsed.getTime();
        }
        if (a.lastUsed) return -1;
        if (b.lastUsed) return 1;
        return a.id.localeCompare(b.id);
      });

      setConnections(connectionsWithHistory);

      if (result.error) {
        setError(result.error);
      } else if (result.connections.length === 0) {
        setError("No connections found. Add connections using the hop CLI.");
      }
    } catch (e) {
      setError(`Failed to load config: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Group by project
  const grouped = connections.reduce(
    (acc, conn) => {
      const key = conn.project || "No Project";
      if (!acc[key]) acc[key] = [];
      acc[key].push(conn);
      return acc;
    },
    {} as Record<string, ConnectionWithHistory[]>
  );

  // Sort groups - "No Project" last
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    if (a === "No Project") return 1;
    if (b === "No Project") return -1;
    return a.localeCompare(b);
  });

  if (error && connections.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="No Connections Found" description={error} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search connections...">
      {sortedGroups.map(([project, conns]) => (
        <List.Section key={project} title={project}>
          {conns.map((conn) => (
            <ConnectionItem key={conn.id} connection={conn} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ConnectionItem({ connection }: { connection: ConnectionWithHistory }) {
  const sshCommand = buildSSHCommand(connection);
  const subtitle = connection.user ? `${connection.user}@${connection.host}` : connection.host;

  const accessories: List.Item.Accessory[] = [];

  if (connection.env) {
    accessories.push({
      tag: { value: connection.env, color: getEnvColor(connection.env) },
    });
  }

  if (connection.tags?.length) {
    connection.tags.forEach((tag) => {
      accessories.push({ tag: { value: tag, color: Color.Purple } });
    });
  }

  if (connection.useCount) {
    accessories.push({
      text: `${connection.useCount}×`,
      tooltip: `Used ${connection.useCount} times`,
    });
  }

  async function connectInTerminal() {
    try {
      const terminalApp = getTerminalApp();
      await closeMainWindow();

      // Use AppleScript for all terminals to ensure command is executed
      const script = getAppleScript(terminalApp, sshCommand);
      await runAppleScript(script);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <List.Item
      icon={Icon.Terminal}
      title={connection.id}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Connect in Terminal" icon={Icon.Terminal} onAction={connectInTerminal} />
            <Action.CopyToClipboard
              title="Copy SSH Command"
              content={sshCommand}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Host"
              content={connection.host}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {connection.user && (
              <Action.CopyToClipboard
                title="Copy User@Host"
                content={`${connection.user}@${connection.host}`}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getEnvColor(env: string): Color {
  switch (env.toLowerCase()) {
    case "prod":
    case "production":
      return Color.Red;
    case "staging":
      return Color.Orange;
    case "dev":
    case "development":
      return Color.Green;
    default:
      return Color.Blue;
  }
}

function getAppleScript(terminal: string | undefined, command: string): string {
  // Escape the command for AppleScript
  const escapedCommand = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  switch (terminal) {
    case "iTerm":
      return `
        tell application "iTerm"
          activate
          if (count of windows) = 0 then
            create window with default profile
          end if
          tell current session of current window
            write text "${escapedCommand}"
          end tell
        end tell
      `;

    case "Warp":
      // For Warp, paste command and use direct key press
      return `
        set the clipboard to "${escapedCommand}"
        tell application "Warp" to activate
        delay 1
        tell application "System Events"
          keystroke "t" using command down
          delay 0.5
          keystroke "v" using command down
          delay 1.0
        end tell
        tell application "System Events" to key code 36
      `;

    case "Alacritty":
      return `
        tell application "Alacritty"
          activate
        end tell
        delay 0.3
        tell application "System Events"
          tell process "Alacritty"
            keystroke "${escapedCommand}"
            keystroke return
          end tell
        end tell
      `;

    case "kitty":
      return `
        do shell script "open -a kitty"
        delay 0.5
        tell application "System Events"
          tell process "kitty"
            keystroke "${escapedCommand}"
            keystroke return
          end tell
        end tell
      `;

    case "Terminal":
    default:
      return `
        tell application "Terminal"
          activate
          if (count of windows) = 0 then
            do script "${escapedCommand}"
          else
            do script "${escapedCommand}" in front window
          end if
        end tell
      `;
  }
}
