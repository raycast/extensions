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
import {
  enablePlugin,
  disablePlugin,
  uninstallPlugin,
  updatePlugin,
} from "../lib/plugins";
import type { PluginInfo } from "../types";

export function PluginsView({
  enabledPlugins,
  disabledPlugins,
  isLoading,
  revalidate,
}: {
  enabledPlugins: PluginInfo[];
  disabledPlugins: PluginInfo[];
  isLoading: boolean;
  revalidate: () => void;
}) {
  const isEmpty = enabledPlugins.length === 0 && disabledPlugins.length === 0;

  return (
    <>
      {isEmpty && !isLoading && (
        <List.EmptyView
          title="No Plugins Installed"
          description="Install plugins using Claude Code's /install-plugin command."
          icon={Icon.Plug}
        />
      )}
      {enabledPlugins.length > 0 && (
        <List.Section title="Enabled" subtitle={`${enabledPlugins.length}`}>
          {enabledPlugins.map((p) => (
            <PluginListItem key={p.key} plugin={p} revalidate={revalidate} />
          ))}
        </List.Section>
      )}
      {disabledPlugins.length > 0 && (
        <List.Section title="Disabled" subtitle={`${disabledPlugins.length}`}>
          {disabledPlugins.map((p) => (
            <PluginListItem key={p.key} plugin={p} revalidate={revalidate} />
          ))}
        </List.Section>
      )}
    </>
  );
}

function PluginListItem({
  plugin,
  revalidate,
}: {
  plugin: PluginInfo;
  revalidate: () => void;
}) {
  const description = plugin.metadata?.description ?? "";

  const accessories: List.Item.Accessory[] = [];

  if (plugin.blocklist) {
    accessories.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
      tooltip: `Blocked: ${plugin.blocklist.reason}`,
    });
  }

  if (!plugin.installPathExists) {
    accessories.push({
      icon: { source: Icon.Warning, tintColor: Color.Orange },
      tooltip: "Install path missing",
    });
  }

  if (plugin.installation.scope === "local") {
    accessories.push({
      tag: { value: "Local", color: Color.Purple },
    });
  }

  accessories.push({
    tag: { value: plugin.marketplaceId || "unknown", color: Color.Blue },
  });

  const version = plugin.installation.version;
  if (version && version !== "unknown") {
    const displayVersion = version.length > 8 ? version.slice(0, 7) : version;
    accessories.push({
      tag: { value: `v${displayVersion}`, color: Color.SecondaryText },
    });
  }

  const icon = plugin.enabled
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: Icon.Circle, tintColor: Color.SecondaryText };

  return (
    <List.Item
      title={plugin.name}
      subtitle={description}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Plugin">
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={
                <PluginDetailView plugin={plugin} revalidate={revalidate} />
              }
            />
            <Action
              title={plugin.enabled ? "Disable Plugin" : "Enable Plugin"}
              icon={plugin.enabled ? Icon.CircleDisabled : Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => handleToggle(plugin, revalidate)}
            />
            <Action
              title="Update Plugin"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={() => handleUpdate(plugin, revalidate)}
            />
            {plugin.metadata?.homepage && (
              <Action.OpenInBrowser
                title="Open Homepage"
                url={plugin.metadata.homepage}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Plugin Key"
              content={plugin.key}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Install Path"
              content={plugin.installation.installPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Uninstall Plugin"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => handleUninstall(plugin, revalidate)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PluginDetailView({
  plugin,
  revalidate,
}: {
  plugin: PluginInfo;
  revalidate: () => void;
}) {
  const meta = plugin.metadata;
  const contents = plugin.contents;

  let markdown = `# ${meta?.name || plugin.name}\n\n`;
  if (meta?.description) markdown += `${meta.description}\n\n`;

  markdown += `---\n\n`;

  if (contents) {
    if (contents.commands.length > 0) {
      markdown += `## Commands\n\n`;
      for (const cmd of contents.commands) {
        markdown += `- \`/${cmd}\`\n`;
      }
      markdown += `\n`;
    }
    if (contents.skills.length > 0) {
      markdown += `## Skills\n\n`;
      for (const skill of contents.skills) {
        markdown += `- ${skill}\n`;
      }
      markdown += `\n`;
    }
    if (contents.agents.length > 0) {
      markdown += `## Agents\n\n`;
      for (const agent of contents.agents) {
        markdown += `- ${agent}\n`;
      }
      markdown += `\n`;
    }
    if (contents.mcpServers.length > 0) {
      markdown += `## MCP Servers\n\n`;
      for (const server of contents.mcpServers) {
        markdown += `- ${server}\n`;
      }
      markdown += `\n`;
    }
  }

  const installedDate = plugin.installation.installedAt
    ? new Date(plugin.installation.installedAt).toLocaleDateString()
    : "Unknown";
  const updatedDate = plugin.installation.lastUpdated
    ? new Date(plugin.installation.lastUpdated).toLocaleDateString()
    : "Unknown";

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Plugin Key" text={plugin.key} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={plugin.enabled ? "Enabled" : "Disabled"}
              color={plugin.enabled ? Color.Green : Color.SecondaryText}
            />
            {plugin.blocklist && (
              <Detail.Metadata.TagList.Item text="Blocked" color={Color.Red} />
            )}
            {!plugin.installPathExists && (
              <Detail.Metadata.TagList.Item
                text="Missing"
                color={Color.Orange}
              />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Version"
            text={plugin.installation.version || "unknown"}
          />
          {meta?.author?.name && (
            <Detail.Metadata.Label title="Author" text={meta.author.name} />
          )}
          <Detail.Metadata.Label
            title="Marketplace"
            text={plugin.marketplaceId || "unknown"}
          />
          {plugin.marketplace?.source?.repo && (
            <Detail.Metadata.Label
              title="Source Repo"
              text={plugin.marketplace.source.repo}
            />
          )}
          <Detail.Metadata.Label
            title="Scope"
            text={plugin.installation.scope}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Installed" text={installedDate} />
          <Detail.Metadata.Label title="Last Updated" text={updatedDate} />
          {plugin.installation.gitCommitSha && (
            <Detail.Metadata.Label
              title="Git SHA"
              text={plugin.installation.gitCommitSha.slice(0, 8)}
            />
          )}
          <Detail.Metadata.Separator />
          {contents && (
            <>
              <Detail.Metadata.Label
                title="Commands"
                text={`${contents.commands.length}`}
              />
              <Detail.Metadata.Label
                title="Skills"
                text={`${contents.skills.length}`}
              />
              <Detail.Metadata.Label
                title="Agents"
                text={`${contents.agents.length}`}
              />
              <Detail.Metadata.Label
                title="MCP Servers"
                text={`${contents.mcpServers.length}`}
              />
            </>
          )}
          {plugin.blocklist && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Block Reason"
                text={plugin.blocklist.reason}
              />
              <Detail.Metadata.Label
                title="Block Detail"
                text={plugin.blocklist.text}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={plugin.enabled ? "Disable Plugin" : "Enable Plugin"}
            icon={plugin.enabled ? Icon.CircleDisabled : Icon.CheckCircle}
            onAction={() => handleToggle(plugin, revalidate)}
          />
          <Action
            title="Update Plugin"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            onAction={() => handleUpdate(plugin, revalidate)}
          />
          {plugin.installPathExists && (
            <Action.ShowInFinder
              title="Show in Finder"
              path={plugin.installation.installPath}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
          {meta?.homepage && (
            <Action.OpenInBrowser
              title="Open Homepage"
              url={meta.homepage}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Plugin Key"
            content={plugin.key}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

async function handleToggle(plugin: PluginInfo, revalidate: () => void) {
  const action = plugin.enabled ? "Disable" : "Enable";
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${action === "Disable" ? "Disabling" : "Enabling"} ${plugin.name}...`,
  });
  try {
    if (plugin.enabled) {
      await disablePlugin(plugin.key);
    } else {
      await enablePlugin(plugin.key);
    }
    revalidate();
    toast.style = Toast.Style.Success;
    toast.title = `${action}d ${plugin.name}`;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to ${action.toLowerCase()} plugin`;
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

async function handleUpdate(plugin: PluginInfo, revalidate: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Updating ${plugin.name}...`,
  });
  try {
    const output = await updatePlugin(plugin.key);
    revalidate();
    if (output.includes("already at the latest version")) {
      toast.style = Toast.Style.Success;
      toast.title = `${plugin.name} is already up to date`;
    } else {
      toast.style = Toast.Style.Success;
      toast.title = `Updated ${plugin.name}`;
      toast.message = "Restart Claude Code to apply changes";
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to update plugin";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

async function handleUninstall(plugin: PluginInfo, revalidate: () => void) {
  const confirmed = await confirmAlert({
    title: "Uninstall Plugin",
    message: `Remove "${plugin.name}" from Claude Code?`,
    primaryAction: {
      title: "Uninstall",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Uninstalling ${plugin.name}...`,
  });
  try {
    await uninstallPlugin(plugin.key);
    revalidate();
    toast.style = Toast.Style.Success;
    toast.title = `Uninstalled ${plugin.name}`;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to uninstall plugin";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}
