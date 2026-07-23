import {
  ActionPanel,
  Action,
  List,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useCallback, useMemo } from "react";
import {
  getInstalledTools,
  useGlobal,
  deactivateGlobally,
  uninstallVersion,
  extractErrorMessage,
} from "./mise";
import ToolVersions from "./tool-versions";
import type { MiseInstalledTools, MiseInstalledVersion } from "./types";
import { homedir } from "os";
import { join } from "path";

interface FlatTool {
  plugin: string;
  tool: MiseInstalledVersion;
}

function flattenTools(data: MiseInstalledTools): FlatTool[] {
  const items: FlatTool[] = [];
  for (const [plugin, versions] of Object.entries(data)) {
    for (const tool of versions) {
      items.push({ plugin, tool });
    }
  }
  return items;
}

function getSourceTag(tool: MiseInstalledVersion) {
  if (tool.active && tool.source) {
    const miseConfigDir = join(homedir(), ".config", "mise");
    if (tool.source.path.startsWith(miseConfigDir)) {
      return { tag: { value: "Global", color: Color.Blue }, dir: null };
    }
    const dir = tool.source.path.replace(/\/[^/]+$/, "");
    const shortDir = dir.startsWith(homedir())
      ? "~" + dir.slice(homedir().length)
      : dir;
    return { tag: { value: "Local", color: Color.Orange }, dir: shortDir };
  }
  if (tool.active) {
    return { tag: { value: "Active", color: Color.Green }, dir: null };
  }
  return { tag: { value: "Installed", color: Color.SecondaryText }, dir: null };
}

function getConfirmationMessage(tool: MiseInstalledVersion): string {
  if (tool.active && tool.source) {
    const miseConfigDir = join(homedir(), ".config", "mise");
    const scope = tool.source.path.startsWith(miseConfigDir)
      ? "globally"
      : "locally";
    return `This is your active ${scope} version. Uninstalling will remove it.`;
  }
  if (tool.active) {
    return "This is your active version. Uninstalling will remove it.";
  }
  return "This will remove the installed version from your system.";
}

export default function ShowInstalled() {
  const [filter, setFilter] = useState("all");
  const prefs = getPreferenceValues<Preferences>();

  const fetchTools = useCallback(async () => {
    return await getInstalledTools();
  }, []);

  const { isLoading, data, error, revalidate } = usePromise(fetchTools);

  const tools = flattenTools(data ?? {});

  const filtered = useMemo(() => {
    return tools.filter((t) => {
      if (filter === "active") return t.tool.active;
      if (filter === "inactive") return !t.tool.active;
      return true;
    });
  }, [tools, filter]);

  const uniquePlugins = useMemo(() => {
    const seen = new Map<string, FlatTool>();
    for (const item of filtered) {
      const existing = seen.get(item.plugin);
      if (!existing || (item.tool.active && !existing.tool.active)) {
        seen.set(item.plugin, item);
      }
    }
    return Array.from(seen.values()).sort((a, b) => {
      if (a.tool.active && !b.tool.active) return -1;
      if (!a.tool.active && b.tool.active) return 1;
      return a.plugin.localeCompare(b.plugin);
    });
  }, [filtered]);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load mise"
          description={`Failed to run mise at "${prefs.misePath}". Error: ${error.message}\n\nMake sure mise is installed and the path in preferences is correct.`}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={revalidate}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search installed tools..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          storeValue={true}
          onChange={setFilter}
        >
          <List.Dropdown.Item title="All Tools" value="all" icon={Icon.List} />
          <List.Dropdown.Item
            title="Active"
            value="active"
            icon={Icon.CheckCircle}
          />
          <List.Dropdown.Item
            title="Inactive"
            value="inactive"
            icon={Icon.Circle}
          />
        </List.Dropdown>
      }
    >
      {uniquePlugins.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No Tools Found"
          description="No installed tools match the current filter."
        />
      ) : (
        uniquePlugins.map(({ plugin, tool }) => {
          const id = `${plugin}@${tool.version}`;
          const sourceInfo = getSourceTag(tool);
          return (
            <List.Item
              key={id}
              title={plugin}
              subtitle={
                sourceInfo.dir
                  ? `${tool.version} — ${sourceInfo.dir}`
                  : tool.version
              }
              icon={
                tool.active
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              accessories={[{ tag: sourceInfo.tag }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Versions"
                    icon={Icon.List}
                    target={<ToolVersions plugin={plugin} mode="manage" />}
                  />
                  {!tool.active && (
                    <Action
                      title="Use Globally"
                      icon={Icon.Globe}
                      onAction={async () => {
                        const toast = await showToast({
                          style: Toast.Style.Animated,
                          title: "Setting globally...",
                        });
                        try {
                          await useGlobal(plugin, tool.version);
                          toast.style = Toast.Style.Success;
                          toast.title = "Set globally";
                          revalidate();
                        } catch (e) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Failed";
                          toast.message = extractErrorMessage(e);
                        }
                      }}
                    />
                  )}
                  {tool.active &&
                    tool.source &&
                    tool.source.path.startsWith(
                      join(homedir(), ".config", "mise"),
                    ) && (
                      <Action
                        title="Deactivate Globally"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          const ok = await confirmAlert({
                            title: `Deactivate ${plugin} globally?`,
                            message:
                              "This will remove the global pin. The tool may still be active via local config.",
                          });
                          if (!ok) return;
                          const toast = await showToast({
                            style: Toast.Style.Animated,
                            title: "Deactivating...",
                          });
                          try {
                            await deactivateGlobally(plugin);
                            toast.style = Toast.Style.Success;
                            toast.title = "Deactivated globally";
                            revalidate();
                          } catch (e) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed";
                            toast.message = extractErrorMessage(e);
                          }
                        }}
                      />
                    )}
                  <Action
                    title="Uninstall"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const ok = await confirmAlert({
                        title: `Uninstall ${plugin}@${tool.version}?`,
                        message: getConfirmationMessage(tool),
                      });
                      if (!ok) return;
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Uninstalling...",
                      });
                      try {
                        await uninstallVersion(plugin, tool.version);
                        toast.style = Toast.Style.Success;
                        toast.title = "Uninstalled";
                        revalidate();
                      } catch (e) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed";
                        toast.message = extractErrorMessage(e);
                      }
                    }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                  />
                  <Action.CopyToClipboard
                    title="Copy Plugin@version"
                    content={id}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
