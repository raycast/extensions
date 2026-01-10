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
  updatePluginAllScopes,
  uninstallPlugin,
  uninstallPluginAllScopes,
  enablePlugin,
  disablePlugin,
  openInFinder,
  openInVSCode,
} from "./lib/claude-cli";
import { invalidateCache, CACHE_KEYS } from "./lib/cache-manager";
import { ErrorView } from "./components/ErrorView";
import type { CLIResult } from "./lib/types";

export default function BrowsePlugins() {
  const { plugins, isLoading, error, refetch } = usePlugins();
  const [searchText, setSearchText] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");

  if (error) {
    return <ErrorView error={error} />;
  }

  // Helper function to get icon for scope
  const getScopeIcon = (scope: "user" | "project" | "local"): Icon => {
    switch (scope) {
      case "user":
        return Icon.Person;
      case "project":
        return Icon.Folder;
      case "local":
        return Icon.Document;
    }
  };

  // Helper function to get display title for scope
  const getScopeDisplayTitle = (
    scope: "user" | "project" | "local",
    projectPath?: string,
  ): string => {
    if (scope === "user") {
      return "User Scope";
    }

    // For local/project scopes, show project path if available
    if (projectPath) {
      const projectName = projectPath.split("/").pop() || projectPath;
      const scopeLabel = scope.charAt(0).toUpperCase() + scope.slice(1);
      return `${scopeLabel}: ${projectName}`;
    }

    // Fallback if no project path
    return `${scope.charAt(0).toUpperCase() + scope.slice(1)} Scope`;
  };

  // Helper function to generate unique key for scope installations
  const getScopeKey = (
    prefix: string,
    scope: "user" | "project" | "local",
    projectPath: string | undefined,
    idx: number,
  ): string => {
    return `${prefix}-${scope}-${projectPath || scope}-${idx}`;
  };

  // Generic helper to execute plugin operations with toast feedback
  const executePluginOperation = async (
    operation: () => Promise<CLIResult>,
    operationName: string,
    pluginId: string,
    successMessage?: string,
  ) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${operationName} ${pluginId}...`,
    });
    try {
      const result = await operation();
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = `${pluginId} ${operationName.toLowerCase()}`;
        if (successMessage) {
          toast.message = successMessage;
        }
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        refetch();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to ${operationName.toLowerCase()} ${pluginId}`;
        toast.message = result.error;
      }
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to ${operationName.toLowerCase()} ${pluginId}`;
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  // Helper function to calculate relevance score for sorting
  const calculateRelevanceScore = (
    plugin: (typeof plugins)[0],
    query: string,
  ): number => {
    if (!query) return 0;

    const lowerQuery = query.toLowerCase();
    const lowerName = plugin.name.toLowerCase();
    const lowerDesc = plugin.description.toLowerCase();

    let score = 0;

    // Name matching (highest priority)
    if (lowerName === lowerQuery) {
      score += 1000; // Exact match
    } else if (lowerName.startsWith(lowerQuery)) {
      score += 500; // Starts with query
    } else if (lowerName.includes(lowerQuery)) {
      score += 100; // Contains query
      // Bonus for word boundary match (e.g., "app" in "app-dev")
      if (
        lowerName.includes(`${lowerQuery}-`) ||
        lowerName.includes(`-${lowerQuery}`)
      ) {
        score += 50;
      }
    }

    // Description matching (lower priority)
    if (lowerDesc.includes(lowerQuery)) {
      score += 10;
      // Bonus if it's a word boundary match
      const wordBoundaryRegex = new RegExp(`\\b${lowerQuery}`, "i");
      if (wordBoundaryRegex.test(lowerDesc)) {
        score += 5;
      }
    }

    // Bonus for installed plugins
    if (plugin.installations.length > 0) {
      score += 20;
    }

    // Bonus for enabled plugins
    if (plugin.installations.some((i) => i.enabled !== false)) {
      score += 10;
    }

    return score;
  };

  const filteredPlugins = plugins
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchText.toLowerCase()) ||
        p.description.toLowerCase().includes(searchText.toLowerCase());
      const matchesMarketplace =
        marketplaceFilter === "all" || p.marketplace === marketplaceFilter;
      return matchesSearch && matchesMarketplace;
    })
    .sort((a, b) => {
      // Sort by relevance score when searching
      if (searchText) {
        const scoreA = calculateRelevanceScore(a, searchText);
        const scoreB = calculateRelevanceScore(b, searchText);
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }
      }
      // Fallback to alphabetical order
      return a.name.localeCompare(b.name);
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
    const pluginId = `${pluginName}@${marketplace}`;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${pluginId}...`,
    });
    try {
      const result = await installPlugin(pluginId, scope);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = `${pluginId} installed`;
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
        refetch();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to install ${pluginId}`;
        toast.message = result.error;
      }
    } catch (error: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to install ${pluginId}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleUpdateSingleScope(
    pluginId: string,
    scope: "user" | "project" | "local",
    projectPath?: string,
  ) {
    await executePluginOperation(
      () => updatePlugin(pluginId, scope, projectPath),
      "Updating",
      pluginId,
      `Updated in ${scope} scope`,
    );
  }

  async function handleUpdateAllScopes(
    pluginId: string,
    installations: Array<{
      scope: "user" | "project" | "local";
      projectPath?: string;
    }>,
  ) {
    await executePluginOperation(
      () => updatePluginAllScopes(pluginId, installations),
      "Updating",
      pluginId,
      installations.length > 1
        ? `Updated in ${installations.length} scopes`
        : undefined,
    );
  }

  async function handleUninstallAll(
    pluginId: string,
    installations: Array<{
      scope: "user" | "project" | "local";
      projectPath?: string;
    }>,
  ) {
    if (
      await confirmAlert({
        title: "Uninstall Plugin from All Scopes",
        message: `Are you sure you want to uninstall ${pluginId} from all ${installations.length} scope(s)?`,
        primaryAction: {
          title: "Uninstall All",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Uninstalling ${pluginId}...`,
      });
      try {
        const result = await uninstallPluginAllScopes(pluginId, installations);
        if (result.success) {
          toast.style = Toast.Style.Success;
          toast.title = `${pluginId} uninstalled`;
          toast.message =
            installations.length > 1
              ? `Uninstalled from ${installations.length} scopes`
              : undefined;
          invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
          invalidateCache(CACHE_KEYS.ALL_PLUGINS);
          refetch();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to uninstall ${pluginId}`;
          toast.message = result.error;
        }
      } catch (err: unknown) {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to uninstall ${pluginId}`;
        toast.message = err instanceof Error ? err.message : String(err);
      }
    }
  }

  async function handleUninstall(
    pluginId: string,
    scope: "user" | "project" | "local",
    projectPath?: string,
  ) {
    if (
      await confirmAlert({
        title: "Uninstall Plugin",
        message: `Are you sure you want to uninstall ${pluginId} from ${scope} scope?`,
        primaryAction: {
          title: "Uninstall",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Uninstalling ${pluginId}...`,
      });
      try {
        const result = await uninstallPlugin(pluginId, scope, projectPath);
        if (result.success) {
          toast.style = Toast.Style.Success;
          toast.title = `${pluginId} uninstalled`;
          invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
          invalidateCache(CACHE_KEYS.ALL_PLUGINS);
          refetch();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to uninstall ${pluginId}`;
          toast.message = result.error;
        }
      } catch (err: unknown) {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to uninstall ${pluginId}`;
        toast.message = err instanceof Error ? err.message : String(err);
      }
    }
  }

  async function handleEnable(
    pluginId: string,
    scope: "user" | "project" | "local",
    projectPath?: string,
  ) {
    await executePluginOperation(
      () => enablePlugin(pluginId, scope, projectPath),
      "Enabling",
      pluginId,
    );
  }

  async function handleDisable(
    pluginId: string,
    scope: "user" | "project" | "local",
    projectPath?: string,
  ) {
    await executePluginOperation(
      () => disablePlugin(pluginId, scope, projectPath),
      "Disabling",
      pluginId,
    );
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

        if (plugin.installations.length > 0) {
          // Show installation count and status
          if (plugin.installations.length > 1) {
            accessories.push({
              tag: {
                value: `${plugin.installations.length} scopes`,
                color: Color.Blue,
              },
            });
          }

          // Check if any installation is enabled
          const anyEnabled = plugin.installations.some(
            (i) => i.enabled !== false,
          );
          const anyDisabled = plugin.installations.some(
            (i) => i.enabled === false,
          );

          if (anyEnabled && !anyDisabled) {
            accessories.push({ tag: { value: "Enabled", color: Color.Green } });
          } else if (!anyEnabled && anyDisabled) {
            accessories.push({ tag: { value: "Disabled", color: Color.Red } });
          } else if (anyEnabled && anyDisabled) {
            accessories.push({ tag: { value: "Mixed", color: Color.Orange } });
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
          if (plugin.installations.length === 0) {
            return "";
          }

          const installationsList = plugin.installations
            .map((install) => {
              const statusBadge =
                install.enabled !== false
                  ? `![status](https://img.shields.io/badge/✓_enabled-22C55E?style=flat-square)`
                  : `![status](https://img.shields.io/badge/✗_disabled-EF4444?style=flat-square)`;

              const scopeBadge = `![scope](https://img.shields.io/badge/scope-${install.scope}-6366F1?style=flat-square)`;

              // Build installation title with project path for local/project scopes
              const installTitle = getScopeDisplayTitle(
                install.scope,
                install.projectPath,
              );

              let details = `### ${installTitle}\n\n${statusBadge} ${scopeBadge}\n\n**Path**: \`${install.installPath}\``;

              if (install.version) {
                details += `\n\n**Version**: \`${install.version}\``;
              }

              if (install.projectPath) {
                details += `\n\n**Project**: \`${install.projectPath}\``;
              }

              return details;
            })
            .join("\n\n---\n\n");

          return `## 📦 Installation${plugin.installations.length > 1 ? "s" : ""}

${installationsList}`;
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
                {plugin.installations.length === 0 ? (
                  <ActionPanel.Section title="Installation">
                    <Action
                      title="Install Plugin (user Scope)"
                      icon={Icon.Download}
                      onAction={() =>
                        handleInstall(plugin.name, plugin.marketplace, "user")
                      }
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                    />
                  </ActionPanel.Section>
                ) : (
                  <ActionPanel.Section title="Management">
                    {/* Update all scopes */}
                    <Action
                      title={`Update Plugin${plugin.installations.length > 1 ? ` (${plugin.installations.length} scopes)` : ""}`}
                      icon={Icon.ArrowClockwise}
                      onAction={() =>
                        handleUpdateAllScopes(
                          `${plugin.name}@${plugin.marketplace}`,
                          plugin.installations,
                        )
                      }
                      shortcut={{ modifiers: ["cmd"], key: "u" }}
                    />
                    {/* Update by Scope - sub-menu */}
                    {plugin.installations.length > 1 && (
                      <ActionPanel.Submenu
                        title="Update by Scope"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      >
                        {plugin.installations.map((install, idx) => (
                          <React.Fragment
                            key={getScopeKey(
                              "update",
                              install.scope,
                              install.projectPath,
                              idx,
                            )}
                          >
                            <Action
                              title={getScopeDisplayTitle(
                                install.scope,
                                install.projectPath,
                              )}
                              icon={getScopeIcon(install.scope)}
                              onAction={() =>
                                handleUpdateSingleScope(
                                  `${plugin.name}@${plugin.marketplace}`,
                                  install.scope,
                                  install.projectPath,
                                )
                              }
                            />
                          </React.Fragment>
                        ))}
                      </ActionPanel.Submenu>
                    )}
                    {/* Uninstall - single scope: direct button, multiple scopes: submenu */}
                    {plugin.installations.length === 1 ? (
                      <Action
                        title="Uninstall"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "delete" }}
                        onAction={() =>
                          handleUninstall(
                            `${plugin.name}@${plugin.marketplace}`,
                            plugin.installations[0].scope,
                            plugin.installations[0].projectPath,
                          )
                        }
                      />
                    ) : (
                      <>
                        <Action
                          title={`Uninstall All Scopes (${plugin.installations.length})`}
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() =>
                            handleUninstallAll(
                              `${plugin.name}@${plugin.marketplace}`,
                              plugin.installations,
                            )
                          }
                          shortcut={{
                            modifiers: ["cmd", "shift"],
                            key: "delete",
                          }}
                        />
                        <ActionPanel.Submenu
                          title="Uninstall by Scope"
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["cmd"], key: "delete" }}
                        >
                          {plugin.installations.map((install, idx) => (
                            <React.Fragment
                              key={getScopeKey(
                                "uninstall",
                                install.scope,
                                install.projectPath,
                                idx,
                              )}
                            >
                              <Action
                                title={getScopeDisplayTitle(
                                  install.scope,
                                  install.projectPath,
                                )}
                                icon={getScopeIcon(install.scope)}
                                style={Action.Style.Destructive}
                                onAction={() =>
                                  handleUninstall(
                                    `${plugin.name}@${plugin.marketplace}`,
                                    install.scope,
                                    install.projectPath,
                                  )
                                }
                              />
                            </React.Fragment>
                          ))}
                        </ActionPanel.Submenu>
                      </>
                    )}
                    {/* Enable/Disable by Scope - sub-menu */}
                    <ActionPanel.Submenu
                      title="Enable/disable by Scope"
                      icon={Icon.Switch}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    >
                      {plugin.installations.map((install, idx) => {
                        const isEnabled = install.enabled !== false;
                        const scopeLabel = getScopeDisplayTitle(
                          install.scope,
                          install.projectPath,
                        );

                        return (
                          <React.Fragment
                            key={getScopeKey(
                              "toggle",
                              install.scope,
                              install.projectPath,
                              idx,
                            )}
                          >
                            {isEnabled ? (
                              <Action
                                title={`Disable ${scopeLabel}`}
                                icon={getScopeIcon(install.scope)}
                                onAction={() =>
                                  handleDisable(
                                    `${plugin.name}@${plugin.marketplace}`,
                                    install.scope,
                                    install.projectPath,
                                  )
                                }
                              />
                            ) : (
                              <Action
                                title={`Enable ${scopeLabel}`}
                                icon={getScopeIcon(install.scope)}
                                onAction={() =>
                                  handleEnable(
                                    `${plugin.name}@${plugin.marketplace}`,
                                    install.scope,
                                    install.projectPath,
                                  )
                                }
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </ActionPanel.Submenu>
                  </ActionPanel.Section>
                )}
                {/* Development actions - always available if we have a path */}
                {((plugin.installations.length > 0 &&
                  plugin.installations[0].installPath) ||
                  plugin.marketplacePath) && (
                  <ActionPanel.Section title="Development">
                    <Action
                      title="Open in Finder"
                      icon={Icon.Finder}
                      onAction={() => {
                        const pathToOpen =
                          plugin.installations[0]?.installPath ||
                          plugin.marketplacePath!;
                        openInFinder(pathToOpen);
                      }}
                    />
                    <Action
                      title="Open in VS Code"
                      icon={Icon.Code}
                      onAction={() => {
                        const pathToOpen =
                          plugin.installations[0]?.installPath ||
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
                  {plugin.installations.length > 0 &&
                    plugin.installations[0].installPath && (
                      <Action.CopyToClipboard
                        title="Copy Install Path"
                        content={plugin.installations[0].installPath}
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
