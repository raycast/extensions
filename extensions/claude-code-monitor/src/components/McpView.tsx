import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Detail,
  showToast,
  Toast,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { removeMcpServer } from "../lib/mcp";
import type { McpServerInfo } from "../types";

const STATUS_COLOR: Record<string, Color> = {
  Connected: Color.Green,
  "Needs Auth": Color.Orange,
  Unreachable: Color.Yellow,
};

export function McpView({
  servers,
  isLoading,
  revalidate,
}: {
  servers: McpServerInfo[];
  isLoading: boolean;
  revalidate: () => void;
}) {
  const userServers = servers.filter((s) => s.category === "user");
  const cloudServers = servers.filter((s) => s.category === "cloud");
  const builtinServers = servers.filter((s) => s.category === "builtin");

  const isEmpty = servers.length === 0;

  return (
    <>
      {isEmpty && !isLoading && (
        <List.EmptyView
          title="No MCP Servers"
          description='Add MCP servers using "claude mcp add" command.'
          icon={Icon.Globe}
        />
      )}
      {userServers.length > 0 && (
        <List.Section title="User MCPs" subtitle={`${userServers.length}`}>
          {userServers.map((s) => (
            <McpListItem key={s.name} server={s} revalidate={revalidate} />
          ))}
        </List.Section>
      )}
      {cloudServers.length > 0 && (
        <List.Section title="claude.ai" subtitle={`${cloudServers.length}`}>
          {cloudServers.map((s) => (
            <McpListItem key={s.name} server={s} revalidate={revalidate} />
          ))}
        </List.Section>
      )}
      {builtinServers.length > 0 && (
        <List.Section
          title="Built-in MCPs"
          subtitle={`${builtinServers.length}`}
        >
          {builtinServers.map((s) => (
            <McpListItem key={s.name} server={s} revalidate={revalidate} />
          ))}
        </List.Section>
      )}
    </>
  );
}

function McpListItem({
  server,
  revalidate,
}: {
  server: McpServerInfo;
  revalidate: () => void;
}) {
  const isConnected = server.status === "Connected";
  const needsAuth = server.status === "Needs Auth";
  const isUnreachable = server.status === "Unreachable";

  const icon = isConnected
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : needsAuth
      ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
      : isUnreachable
        ? { source: Icon.Warning, tintColor: Color.Yellow }
        : { source: Icon.Circle, tintColor: Color.SecondaryText };

  const accessories: List.Item.Accessory[] = [];

  if (server.type) {
    accessories.push({
      tag: { value: server.type, color: Color.Blue },
    });
  }

  if (isUnreachable && server.statusDetail) {
    accessories.push({
      icon: { source: Icon.Info, tintColor: Color.SecondaryText },
      tooltip: server.statusDetail,
    });
  }

  accessories.push({
    tag: {
      value: server.status || "Unknown",
      color: STATUS_COLOR[server.status] ?? Color.SecondaryText,
    },
    tooltip: isUnreachable
      ? "Health check unreachable — may still work in active sessions"
      : undefined,
  });

  const subtitle =
    server.url ||
    (server.command ? `${server.command} ${server.args || ""}` : "");

  return (
    <List.Item
      title={server.name}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="MCP Server">
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<McpDetailView server={server} revalidate={revalidate} />}
            />
            {needsAuth && server.url && (
              <Action.OpenInBrowser
                title="Open Auth URL"
                url={server.url}
                icon={Icon.Globe}
              />
            )}
            <Action
              title="Refresh Status"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidate}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Server Name"
              content={server.name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {(server.url || server.command) && (
              <Action.CopyToClipboard
                title="Copy Command / URL"
                content={server.url || `${server.command} ${server.args || ""}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          {server.category === "user" && (
            <ActionPanel.Section>
              <Action
                title="Remove Server"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleRemoveMcp(server, revalidate)}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

function McpDetailView({
  server,
  revalidate,
}: {
  server: McpServerInfo;
  revalidate: () => void;
}) {
  let markdown = `# ${server.name}\n\n`;
  if (server.url) markdown += `**URL:** \`${server.url}\`\n\n`;
  if (server.command)
    markdown += `**Command:** \`${server.command} ${server.args || ""}\`\n\n`;
  if (server.status === "Unreachable" && server.statusDetail) {
    markdown += `> **Health Check:** ${server.statusDetail}\n>\n> Unreachable during health check — this does not mean the server cannot work in active Claude Code sessions. npx-based servers often fail health checks due to startup time.\n\n`;
  }

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={server.name} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={server.status || "Unknown"}
              color={STATUS_COLOR[server.status] ?? Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Category" text={server.category} />
          {server.statusDetail && (
            <Detail.Metadata.Label title="Detail" text={server.statusDetail} />
          )}
          <Detail.Metadata.Separator />
          {server.type && (
            <Detail.Metadata.Label title="Type" text={server.type} />
          )}
          {server.command && (
            <Detail.Metadata.Label title="Command" text={server.command} />
          )}
          {server.args && (
            <Detail.Metadata.Label title="Args" text={server.args} />
          )}
          {server.url && (
            <Detail.Metadata.Label title="URL" text={server.url} />
          )}
          {server.env && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Environment" text={server.env} />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh Status"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
          <Action.CopyToClipboard
            title="Copy Server Name"
            content={server.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {server.category === "user" && (
            <Action
              title="Remove Server"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => handleRemoveMcp(server, revalidate)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

async function handleRemoveMcp(server: McpServerInfo, revalidate: () => void) {
  const confirmed = await confirmAlert({
    title: "Remove MCP Server",
    message: `Remove "${server.name}" from Claude Code?`,
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Removing ${server.name}...`,
  });
  try {
    await removeMcpServer(server.name);
    revalidate();
    toast.style = Toast.Style.Success;
    toast.title = `Removed ${server.name}`;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to remove MCP server";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}
