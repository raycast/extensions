/**
 * Browse Claude Plugins - Main command
 */

import React, { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { usePlugins } from "./hooks/usePlugins";
import {
  installPlugin,
  updatePlugin,
  uninstallPlugin,
  enablePlugin,
  disablePlugin,
  openInFinder,
  openInVSCode,
} from "./lib/claude-cli";
import { invalidateCache, CACHE_KEYS } from "./lib/cache-manager";
import { ErrorView } from "./components/ErrorView";

export default function BrowsePlugins() {
  const { plugins, isLoading, error, refetch } = usePlugins();
  const [searchText, setSearchText] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");

  if (error) {
    return <ErrorView error={error} />;
  }

  const filteredPlugins = plugins.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesMarketplace =
      marketplaceFilter === "all" || p.marketplace === marketplaceFilter;
    return matchesSearch && matchesMarketplace;
  });

  const marketplaces = ["all", ...new Set(plugins.map((p) => p.marketplace))];

  // Helper function to escape badge text for shields.io
  const escapeBadgeText = (text: string): string => {
    return text.replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "%20");
  };

  async function handleInstall(
    pluginName: string,
    marketplace: string,
    scope: "user" | "project" | "local",
  ) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing plugin...",
    });
    try {
      const result = await installPlugin(`${pluginName}@${marketplace}`, scope);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Plugin installed successfully";
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
        refetch();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Installation failed";
        toast.message = result.error;
      }
    } catch (error: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleUpdate(
    pluginId: string,
    scope: "user" | "project" | "local",
  ) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating plugin...",
    });
    try {
      const result = await updatePlugin(pluginId, scope);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Plugin updated successfully";
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        refetch();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Update failed";
        toast.message = result.error;
      }
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  async function handleUninstall(
    pluginId: string,
    scope: "user" | "project" | "local",
  ) {
    if (
      await confirmAlert({
        title: "Uninstall Plugin",
        message: `Are you sure you want to uninstall ${pluginId}?`,
        primaryAction: {
          title: "Uninstall",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Uninstalling plugin...",
      });
      try {
        const result = await uninstallPlugin(pluginId, scope);
        if (result.success) {
          toast.style = Toast.Style.Success;
          toast.title = "Plugin uninstalled";
          invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
          invalidateCache(CACHE_KEYS.ALL_PLUGINS);
          refetch();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Uninstall failed";
          toast.message = result.error;
        }
      } catch (err: unknown) {
        toast.style = Toast.Style.Failure;
        toast.title = "Uninstall failed";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    }
  }

  async function handleEnable(
    pluginId: string,
    scope: "user" | "project" | "local",
  ) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Enabling plugin...",
    });
    try {
      const result = await enablePlugin(pluginId, scope);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Plugin enabled";
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        refetch();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Enable failed";
        toast.message = result.error;
      }
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Enable failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  async function handleDisable(
    pluginId: string,
    scope: "user" | "project" | "local",
  ) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Disabling plugin...",
    });
    try {
      const result = await disablePlugin(pluginId, scope);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Plugin disabled";
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        refetch();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Disable failed";
        toast.message = result.error;
      }
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Disable failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search plugins..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Marketplace"
          value={marketplaceFilter}
          onChange={setMarketplaceFilter}
        >
          {marketplaces.map((m: string) => (
            <List.Dropdown.Item
              title={m === "all" ? "All Marketplaces" : m}
              value={m}
            />
          ))}
        </List.Dropdown>
      }
    >
      {filteredPlugins.length === 0 && !isLoading && (
        <List.EmptyView
          title="No plugins found"
          description="Try adjusting your search or marketplace filter"
          icon={Icon.MagnifyingGlass}
        />
      )}
      {filteredPlugins.map((plugin) => {
        const accessories: List.Item.Accessory[] = [];

        if (plugin.installStatus?.installed) {
          // Show enabled/disabled status only
          if (plugin.installStatus.enabled !== false) {
            accessories.push({ tag: { value: "Enabled", color: Color.Green } });
          } else {
            accessories.push({ tag: { value: "Disabled", color: Color.Red } });
          }
        }

        // Build GitHub-style markdown with badges
        const buildMetadataBadges = () => {
          const badges = [];

          // Version badge - only show if version exists
          if (plugin.version) {
            badges.push(
              `![version](https://img.shields.io/badge/v${escapeBadgeText(plugin.version)}-gray?style=flat-square)`,
            );
          }

          // Marketplace badge - using claude icon
          badges.push(
            `![marketplace](https://img.shields.io/badge/${escapeBadgeText(plugin.marketplace)}-CC9B7A?style=flat-square&logo=claude&logoColor=white)`,
          );

          // Author badge with gmail icon
          if (plugin.author?.name) {
            badges.push(
              `![author](https://img.shields.io/badge/${escapeBadgeText(plugin.author.name)}-red?style=flat-square&logo=gmail&logoColor=white)`,
            );
          }

          return badges.join(" ");
        };

        const buildComponentBadges = () => {
          const badges = [];

          if (plugin.components.commands?.count) {
            badges.push(
              `![commands](https://img.shields.io/badge/⌘_commands-${plugin.components.commands.count}-8B5CF6?style=flat-square)`,
            );
          }
          if (plugin.components.skills?.count) {
            badges.push(
              `![skills](https://img.shields.io/badge/✨_skills-${plugin.components.skills.count}-3B82F6?style=flat-square)`,
            );
          }
          if (plugin.components.agents?.count) {
            badges.push(
              `![agents](https://img.shields.io/badge/🤖_agents-${plugin.components.agents.count}-F97316?style=flat-square)`,
            );
          }
          if (plugin.components.hooks?.count) {
            badges.push(
              `![hooks](https://img.shields.io/badge/🪝_hooks-${plugin.components.hooks.count}-EC4899?style=flat-square)`,
            );
          }
          if (plugin.components.mcp) {
            badges.push(
              `![mcp](https://img.shields.io/badge/🔌_MCP-enabled-06B6D4?style=flat-square)`,
            );
          }

          return badges.length > 0 ? badges.join(" ") : "";
        };

        const buildComponentsList = () => {
          const sections = [];

          if (plugin.components.commands?.count) {
            const items = plugin.components.commands.names
              .map((name) => `- \`${name}\``)
              .join("\n");
            sections.push(`### ⌘ Commands\n\n${items}`);
          }

          if (plugin.components.skills?.count) {
            const items = plugin.components.skills.names
              .map((name) => `- \`${name}\``)
              .join("\n");
            sections.push(`### ✨ Skills\n\n${items}`);
          }

          if (plugin.components.agents?.count) {
            const items = plugin.components.agents.names
              .map((name) => `- \`${name}\``)
              .join("\n");
            sections.push(`### 🤖 Agents\n\n${items}`);
          }

          if (plugin.components.hooks?.count) {
            const items = plugin.components.hooks.names
              .map((name) => `- \`${name}\``)
              .join("\n");
            sections.push(`### 🪝 Hooks\n\n${items}`);
          }

          if (plugin.components.mcp) {
            sections.push(
              `### 🔌 MCP Servers\n\n*Model Context Protocol integration enabled*`,
            );
          }

          return sections.length > 0 ? sections.join("\n\n") : "";
        };

        const buildInstallSection = () => {
          // Only show installation section if plugin is installed
          if (!plugin.installStatus?.installed) {
            return "";
          }

          const statusBadge =
            plugin.installStatus.enabled !== false
              ? `![status](https://img.shields.io/badge/✓_enabled-22C55E?style=flat-square)`
              : `![status](https://img.shields.io/badge/✗_disabled-EF4444?style=flat-square)`;

          const scopeBadge = `![scope](https://img.shields.io/badge/scope-${plugin.installStatus.scope || "unknown"}-6366F1?style=flat-square)`;

          return `## 📦 Installation

${statusBadge} ${scopeBadge}

**Path**: \`${plugin.installStatus.installPath || "unknown"}\`${plugin.installStatus.version ? `\n\n**Installed Version**: \`${plugin.installStatus.version}\`` : ""}`;
        };

        const componentBadges = buildComponentBadges();
        const hasComponents = componentBadges.length > 0;
        const installSection = buildInstallSection();

        // Build sections array for cleaner composition
        const sections = [
          `# ${plugin.name}`,
          buildMetadataBadges(),
          plugin.description,
        ];

        if (hasComponents) {
          sections.push("---", componentBadges, buildComponentsList());
        }

        if (installSection) {
          sections.push("---", installSection);
        }

        if (plugin.repositoryUrl) {
          sections.push("---", `[View Repository →](${plugin.repositoryUrl})`);
        }

        const markdown = sections.join("\n\n");

        return (
          <List.Item
            id={`${plugin.name}@${plugin.marketplace}`}
            title={plugin.name}
            accessories={accessories}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              <ActionPanel>
                {!plugin.installStatus?.installed ? (
                  <ActionPanel.Section title="Installation">
                    <Action
                      title="Install (user Scope)"
                      icon={Icon.Download}
                      onAction={() =>
                        handleInstall(plugin.name, plugin.marketplace, "user")
                      }
                    />
                    <Action
                      title="Install (project Scope)"
                      icon={Icon.Download}
                      onAction={() =>
                        handleInstall(
                          plugin.name,
                          plugin.marketplace,
                          "project",
                        )
                      }
                    />
                    <Action
                      title="Install (local Scope)"
                      icon={Icon.Download}
                      onAction={() =>
                        handleInstall(plugin.name, plugin.marketplace, "local")
                      }
                    />
                  </ActionPanel.Section>
                ) : (
                  <ActionPanel.Section title="Management">
                    <Action
                      title="Update Plugin"
                      icon={Icon.ArrowClockwise}
                      onAction={() =>
                        handleUpdate(
                          `${plugin.name}@${plugin.marketplace}`,
                          plugin.installStatus!.scope!,
                        )
                      }
                    />
                    {plugin.installStatus.enabled !== false ? (
                      <Action
                        title="Disable Plugin"
                        icon={Icon.XMarkCircle}
                        onAction={() =>
                          handleDisable(
                            `${plugin.name}@${plugin.marketplace}`,
                            plugin.installStatus!.scope!,
                          )
                        }
                      />
                    ) : (
                      <Action
                        title="Enable Plugin"
                        icon={Icon.CheckCircle}
                        onAction={() =>
                          handleEnable(
                            `${plugin.name}@${plugin.marketplace}`,
                            plugin.installStatus!.scope!,
                          )
                        }
                      />
                    )}
                    <Action
                      title="Uninstall Plugin"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() =>
                        handleUninstall(
                          `${plugin.name}@${plugin.marketplace}`,
                          plugin.installStatus!.scope!,
                        )
                      }
                    />
                  </ActionPanel.Section>
                )}
                {/* Development actions - always available if we have a path */}
                {((plugin.installStatus?.installed &&
                  plugin.installStatus.installPath) ||
                  plugin.marketplacePath) && (
                  <ActionPanel.Section title="Development">
                    <Action
                      title="Open in Finder"
                      icon={Icon.Finder}
                      onAction={() => {
                        const pathToOpen =
                          plugin.installStatus?.installPath ||
                          plugin.marketplacePath!;
                        openInFinder(pathToOpen);
                      }}
                    />
                    <Action
                      title="Open in VS Code"
                      icon={Icon.Code}
                      onAction={() => {
                        const pathToOpen =
                          plugin.installStatus?.installPath ||
                          plugin.marketplacePath!;
                        openInVSCode(pathToOpen);
                      }}
                    />
                  </ActionPanel.Section>
                )}
                {plugin.repositoryUrl && (
                  <ActionPanel.Section title="Links">
                    <Action.OpenInBrowser
                      title="Open Repository"
                      icon={Icon.Globe}
                      url={plugin.repositoryUrl}
                    />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Plugin Id"
                    content={`${plugin.name}@${plugin.marketplace}`}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  {plugin.installStatus?.installed &&
                    plugin.installStatus.installPath && (
                      <Action.CopyToClipboard
                        title="Copy Install Path"
                        content={plugin.installStatus.installPath}
                      />
                    )}
                  {plugin.marketplacePath && (
                    <Action.CopyToClipboard
                      title="Copy Marketplace Path"
                      content={plugin.marketplacePath}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Install Command"
                    content={`claude plugin install ${plugin.name}@${plugin.marketplace}`}
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
