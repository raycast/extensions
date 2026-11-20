import { Action, ActionPanel, Alert, Color, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { basename } from "node:path";
import { useState } from "react";
import { withSkillAction } from "./utils/with-skill-action";
import { getPluginCommand, pluginRowId, type InstalledPlugin } from "./utils/installed-plugins";
import { listInstalledPlugins, runPluginAction } from "./utils/plugin-cli";

type PluginProps = { plugin: InstalledPlugin; refresh: () => void; onRemoved?: () => void };

function PluginActions({ plugin, refresh, onRemoved, showDetails }: PluginProps & { showDetails: boolean }) {
  const toggle = plugin.enabled === true ? "disable" : "enable";
  const canToggle = plugin.enabled !== undefined && getPluginCommand(plugin, toggle);
  const canRemove = getPluginCommand(plugin, "remove");

  return (
    <ActionPanel>
      {showDetails && (
        <Action.Push
          title="View Plugin Details"
          icon={Icon.Sidebar}
          target={<PluginDetail plugin={plugin} refresh={refresh} />}
        />
      )}
      <ActionPanel.Section>
        {plugin.path && <Action.ShowInFinder path={plugin.path} icon={Icon.Finder} />}
        <Action.CopyToClipboard title="Copy Plugin ID" content={plugin.id} />
        {plugin.path && <Action.CopyToClipboard title="Copy Plugin Path" content={plugin.path} />}
      </ActionPanel.Section>
      {(canToggle || canRemove) && (
        <ActionPanel.Section title="Manage">
          {canToggle && (
            <Action
              title={`${toggle === "enable" ? "Enable" : "Disable"} Plugin`}
              icon={toggle === "enable" ? Icon.Checkmark : Icon.Minus}
              onAction={() =>
                withSkillAction({
                  toast: {
                    animatedTitle: `${toggle === "enable" ? "Enabling" : "Disabling"} plugin...`,
                    successTitle: `Plugin ${toggle}d`,
                    failureTitle: `Failed to ${toggle} plugin`,
                  },
                  operation: () => runPluginAction(plugin, toggle),
                  onSuccess: refresh,
                })
              }
            />
          )}
          {canRemove && (
            <Action
              title="Remove Plugin"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() =>
                withSkillAction({
                  confirm: {
                    title: `Remove ${plugin.name} from ${plugin.host}?`,
                    message:
                      plugin.host === "Claude Code"
                        ? "The plugin will be uninstalled from user scope. Its persistent data will be kept."
                        : "The plugin and its local Codex cache will be removed.",
                    primaryAction: { title: "Remove Plugin", style: Alert.ActionStyle.Destructive },
                  },
                  toast: {
                    animatedTitle: "Removing plugin...",
                    successTitle: "Plugin removed",
                    failureTitle: "Failed to remove plugin",
                  },
                  operation: () => runPluginAction(plugin, "remove"),
                  onSuccess: () => {
                    if (onRemoved) onRemoved();
                    else refresh();
                  },
                })
              }
            />
          )}
        </ActionPanel.Section>
      )}
      <Action title="Refresh Plugins" icon={Icon.RotateClockwise} onAction={refresh} />
    </ActionPanel>
  );
}

function PluginDetail({ plugin, refresh }: PluginProps) {
  const { pop } = useNavigation();
  const [current, setCurrent] = useState(plugin);
  async function refreshDetail() {
    const listed = await listInstalledPlugins();
    const updated = listed.plugins.find((item) => pluginRowId(item) === pluginRowId(current));
    if (updated) setCurrent(updated);
    else pop();
    refresh();
  }
  const status = current.enabled === undefined ? "Unknown" : current.enabled ? "Enabled" : "Disabled";
  const fields = [
    ["Host", current.host],
    ["Status", status],
    ["ID", current.id],
    ["Version", current.version],
    ["Scope", current.scope],
    ["Project", current.projectPath],
    ["Marketplace", current.marketplace],
  ];
  const lines = fields.filter(([, value]) => value).map(([label, value]) => `**${label}:** ${value}`);
  if (current.path) lines.push(`**Location:**\n\n\`${current.path}\``);
  if (current.host === "Claude Code" && current.scope !== "user") {
    lines.push("**Management:** Open the owning project to manage project or local plugins.");
  }
  return (
    <Detail
      navigationTitle={current.name}
      markdown={`# ${current.name}\n\n${lines.join("\n\n")}`}
      actions={
        <PluginActions
          plugin={current}
          refresh={refreshDetail}
          onRemoved={() => {
            pop();
            refresh();
          }}
          showDetails={false}
        />
      }
    />
  );
}

function PluginItem({ plugin, refresh }: PluginProps) {
  const status = plugin.enabled === undefined ? "Unknown" : plugin.enabled ? "Enabled" : "Disabled";
  return (
    <List.Item
      id={pluginRowId(plugin)}
      title={plugin.name}
      subtitle={plugin.projectPath ? basename(plugin.projectPath) : plugin.id}
      icon={{ source: Icon.Box, tintColor: plugin.enabled === false ? Color.SecondaryText : Color.Blue }}
      accessories={[
        ...(plugin.scope ? [{ text: plugin.scope }] : []),
        ...(plugin.version ? [{ text: plugin.version }] : []),
        { tag: { value: status, color: plugin.enabled === false ? Color.Orange : Color.Green } },
      ]}
      keywords={[plugin.id, plugin.host, plugin.marketplace ?? "", plugin.scope ?? "", plugin.projectPath ?? ""]}
      actions={<PluginActions plugin={plugin} refresh={refresh} showDetails />}
    />
  );
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(listInstalledPlugins, []);
  const [host, setHost] = useState("all");
  const plugins = data?.plugins.filter((plugin) => host === "all" || plugin.host === host) ?? [];
  const errors = data?.errors ?? {};
  const hosts = ["Claude Code", "Codex"] as const;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search installed plugins..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Host" value={host} onChange={setHost}>
          <List.Dropdown.Item title="All Hosts" value="all" />
          {hosts.map((name) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown>
      }
    >
      {!plugins.length && !isLoading && (
        <List.EmptyView
          title="No Installed Plugins Found"
          description="Refresh the list or check that the Claude Code and Codex CLIs are installed."
          icon={Icon.Box}
          actions={
            <ActionPanel>
              <Action title="Refresh Plugins" onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {hosts.map((name) => {
        const items = plugins.filter((plugin) => plugin.host === name);
        return items.length ? (
          <List.Section key={name} title={name} subtitle={`${items.length} installed`}>
            {items.map((plugin) => (
              <PluginItem key={pluginRowId(plugin)} plugin={plugin} refresh={revalidate} />
            ))}
          </List.Section>
        ) : null;
      })}
      {Object.entries(errors).map(([name, message]) => (
        <List.Section key={name} title={`${name} Unavailable`}>
          <List.Item
            title="Could not load installed plugins"
            subtitle={message}
            icon={Icon.Warning}
            actions={
              <ActionPanel>
                <Action title="Retry" onAction={revalidate} />
              </ActionPanel>
            }
          />
        </List.Section>
      ))}
    </List>
  );
}
