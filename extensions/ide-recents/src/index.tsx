import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ProjectItem } from "./providers/types";
import { allProviders, getProviderById } from "./providers/registry";
import { loadProjectsFromProvider, mergeProjects, removePathsFromAllDatabases, type RemovalReport } from "./utils/db";
import { formatOpenCommand, runOpenCommand } from "./utils/exec";

/** LocalStorage key for the paths the user hid from the list */
const HIDDEN_PATHS_STORAGE_KEY = "hidden_recents_paths";

/** GitHub Dark theme accents used for list icons and tags */
const PALETTE = {
  blue: "#58A6FF",
  green: "#3FB950",
  purple: "#A371F7",
  yellow: "#D29922",
  gray: "#8B949E",
};

/** Convenience shortcuts for the registered editors */
const IDE_SHORTCUTS: Record<string, Keyboard.Shortcut> = {
  vscode: { modifiers: ["cmd"], key: "1" },
  trae: { modifiers: ["cmd"], key: "2" },
  antigravity: { modifiers: ["cmd"], key: "3" },
};

/** A local path that does not exist on disk anymore */
function isMissing(item: ProjectItem): boolean {
  return item.exists === false && item.type !== "remote";
}

/** One-line summary of a cleanup: what was removed and what failed */
function removalSummary(report: RemovalReport): string {
  const removed = report.results
    .filter((result) => result.removedCount > 0)
    .map((result) => `${result.providerName}: removed ${result.removedCount}`);
  const failed = report.failures.map((result) => `${result.providerName}: ${result.error}`);
  const noBackup = report.results.some((result) => result.backupFailures.length > 0)
    ? ["no .bak backup could be written"]
    : [];
  return [...removed, ...failed, ...noBackup].join(" · ").slice(0, 240);
}

async function readHiddenPaths(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(HIDDEN_PATHS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    // A corrupted preference must not break the whole command
    return [];
  }
}

async function writeHiddenPaths(paths: string[]): Promise<void> {
  await LocalStorage.setItem(HIDDEN_PATHS_STORAGE_KEY, JSON.stringify(Array.from(new Set(paths))));
}

export default function Command() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [hiddenPaths, setHiddenPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<string>("all");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      setHiddenPaths(await readHiddenPaths());

      const allProjectLists: ProjectItem[] = [];
      for (const provider of allProviders) {
        allProjectLists.push(...loadProjectsFromProvider(provider));
      }

      if (allProjectLists.length === 0) {
        throw new Error(
          "No recent projects found in any IDE database. Open a project in VS Code, Trae, or Antigravity first.",
        );
      }

      setProjects(mergeProjects(allProjectLists));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorDetails(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load recent projects",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hiddenSet = useMemo(() => new Set(hiddenPaths), [hiddenPaths]);
  const visibleProjects = useMemo(() => projects.filter((item) => !hiddenSet.has(item.path)), [projects, hiddenSet]);
  const hiddenProjects = useMemo(() => projects.filter((item) => hiddenSet.has(item.path)), [projects, hiddenSet]);
  const missingProjects = useMemo(() => visibleProjects.filter(isMissing), [visibleProjects]);
  /** Hidden paths that no longer show up in any IDE database */
  const staleHiddenCount = hiddenPaths.length - hiddenProjects.length;

  const filteredProjects = useMemo(() => {
    switch (filterMode) {
      case "valid_only":
        return visibleProjects.filter((item) => !isMissing(item));
      case "missing_only":
        return visibleProjects.filter(isMissing);
      case "hidden":
        return hiddenProjects;
      case "all":
        return visibleProjects;
      default:
        // Any remaining filter value is an IDE id
        return visibleProjects.filter((item) => item.sources.includes(filterMode));
    }
  }, [filterMode, visibleProjects, hiddenProjects]);

  const availableProviders = useMemo(() => {
    const sourceIds = new Set(projects.flatMap((item) => item.sources));
    return allProviders.filter((provider) => sourceIds.has(provider.id));
  }, [projects]);

  /** Hide paths in the list only; IDE databases are never touched */
  const hidePaths = useCallback(async (paths: string[]) => {
    const stored = await readHiddenPaths();
    const next = Array.from(new Set([...stored, ...paths]));
    await writeHiddenPaths(next);
    setHiddenPaths(next);
  }, []);

  /** Bring hidden paths back into the list */
  const restorePaths = useCallback(async (paths: string[]) => {
    const restoreSet = new Set(paths);
    const stored = await readHiddenPaths();
    const next = stored.filter((path) => !restoreSet.has(path));
    await writeHiddenPaths(next);
    setHiddenPaths(next);
    return stored.length - next.length;
  }, []);

  const handleHide = async (items: ProjectItem[]) => {
    await hidePaths(items.map((item) => item.path));
    await showToast({
      style: Toast.Style.Success,
      title: items.length === 1 ? "Hidden from the list" : `Hid ${items.length} projects from the list`,
      message: "IDE databases were not changed",
    });
  };

  const handleRestore = async (items: ProjectItem[]) => {
    const restored = await restorePaths(items.map((item) => item.path));
    await showToast({
      style: Toast.Style.Success,
      title: restored === 1 ? "Restored 1 project" : `Restored ${restored} projects`,
      message: "Back in the list",
    });
  };

  const handleRestoreAll = async () => {
    const total = hiddenPaths.length;
    await restorePaths(hiddenPaths);
    await showToast({
      style: Toast.Style.Success,
      title: `Restored ${total} hidden project${total === 1 ? "" : "s"}`,
      message: staleHiddenCount > 0 ? "Includes paths that are no longer in any IDE database" : "Back in the list",
    });
  };

  /**
   * Deleting is the only operation that writes to the IDE databases.
   *
   * A removal is only hidden from the list when every database could be
   * updated, and neither the number of removed records nor a missing backup is
   * ever reported as a plain success.
   */
  const handleDelete = async (items: ProjectItem[]) => {
    const paths = items.map((item) => item.path);
    const isBatch = items.length > 1;
    const scope = isBatch ? `${items.length} projects` : `"${items[0].name}"`;

    const confirmed = await confirmAlert({
      title: isBatch
        ? `Delete ${items.length} projects from the IDE databases?`
        : "Delete this project from the IDE databases?",
      message: `${scope} is removed from every VS Code, Trae and Antigravity database that still lists it, and hidden from this list afterwards. A .bak copy of each database is written before it is modified.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: { title: "Cancel" },
    });
    if (!confirmed) return;

    const report = removePathsFromAllDatabases(allProviders, paths);
    const backupFailed = report.results.some((result) => result.backupFailures.length > 0);

    if (report.failures.length > 0) {
      // Records that are still in an editor database stay visible: hiding them
      // would claim a removal that never happened.
      await showToast({
        style: Toast.Style.Failure,
        title:
          report.totalRemoved > 0 ? "Partly removed from the IDE databases" : "Could not remove from the IDE databases",
        message: `Kept in the list — ${removalSummary(report)}`,
      });
      return;
    }

    await hidePaths(paths);

    const notes: string[] = [];
    if (isBatch) notes.push(`${items.length} projects hidden`);

    const deletedTitle =
      report.totalRemoved > 0
        ? `Deleted ${report.totalRemoved} record${report.totalRemoved === 1 ? "" : "s"} from the IDE databases`
        : "No matching record left in the IDE databases";

    // The databases were modified without a copy to fall back on, so this is
    // not a plain success and must not be reported as one.
    await showToast({
      style: backupFailed ? Toast.Style.Failure : Toast.Style.Success,
      title: backupFailed ? "Deleted, but no .bak backup was created" : deletedTitle,
      message: backupFailed
        ? `${scope} is gone from the IDE databases and this list, but the databases were changed without a .bak copy`
        : [scope, ...notes].join(" · "),
    });
  };

  const openProject = async (item: ProjectItem, ideId: string) => {
    const provider = getProviderById(ideId);
    if (!provider) return;

    if (isMissing(item)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project path does not exist",
        message: `Not found on disk: ${item.path}`,
      });
      return;
    }

    // Commands are tried in order; the path is always passed as a separate
    // argument and never goes through a shell.
    let lastError = "";
    for (const command of provider.getOpenCommands(item.path)) {
      const result = await runOpenCommand(command);
      if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: `Opening in ${provider.name}...`,
        });
        await closeMainWindow();
        return;
      }
      lastError = result.error || "";
    }

    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open in ${provider.name}`,
      message: lastError
        ? lastError.replace(/\n+/g, " ").slice(0, 100)
        : "Please check that the CLI or the app is installed",
    });
  };

  const getItemIcon = (item: ProjectItem) => {
    if (isMissing(item)) {
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    }
    if (item.type === "remote") {
      return { source: Icon.Globe, tintColor: PALETTE.green };
    }
    if (item.type === "workspace") {
      return { source: Icon.Box, tintColor: PALETTE.purple };
    }
    if (item.type === "folder") {
      return { source: Icon.Folder, tintColor: PALETTE.blue };
    }

    switch (item.extension) {
      case "ts":
      case "tsx":
        return { source: Icon.CodeBlock, tintColor: PALETTE.blue };
      case "js":
      case "jsx":
        return { source: Icon.CodeBlock, tintColor: PALETTE.yellow };
      case "json":
        return { source: Icon.Gear, tintColor: PALETTE.gray };
      case "md":
        return { source: Icon.Document, tintColor: Color.PrimaryText };
      case "py":
        return { source: Icon.Code, tintColor: PALETTE.green };
      default:
        return { source: Icon.Document, tintColor: PALETTE.gray };
    }
  };

  const getBadgeText = (item: ProjectItem) => {
    switch (item.type) {
      case "remote":
        return "Remote";
      case "workspace":
        return "Workspace";
      case "folder":
        return "Directory";
      case "file":
        return item.extension ? `.${item.extension}` : "File";
      default:
        return "Repository";
    }
  };

  const getSourceTags = (item: ProjectItem) => {
    const tags: List.Item.Accessory[] = [];

    if (isMissing(item)) {
      tags.push({
        tag: { value: "Missing", color: Color.Red },
        tooltip: "The path does not exist on disk anymore",
      });
    }

    tags.push({
      tag: {
        value: getBadgeText(item),
        color: item.type === "workspace" ? PALETTE.purple : item.type === "remote" ? PALETTE.green : PALETTE.gray,
      },
    });

    for (const sourceId of item.sources) {
      const provider = getProviderById(sourceId);
      if (provider) {
        tags.push({
          tag: { value: provider.name, color: provider.color },
        });
      }
    }

    return tags;
  };

  /** Title and description of the empty state for the current filter */
  const emptyState = useMemo(() => {
    switch (filterMode) {
      case "hidden":
        return {
          title: "No hidden projects",
          description:
            staleHiddenCount > 0
              ? `${staleHiddenCount} hidden path${staleHiddenCount === 1 ? "" : "s"} can no longer be found in any IDE database.`
              : "Projects you hide stay in the IDE databases and only leave this list.",
        };
      case "missing_only":
        return {
          title: "No missing projects",
          description: "Every project in this list still exists on disk.",
        };
      case "valid_only":
        return {
          title: "No active projects",
          description: "All recent projects are missing on disk.",
        };
      default:
        return filterMode === "all"
          ? {
              title: "No recent projects",
              description: "Open a project in VS Code, Trae, or Antigravity and reload the list.",
            }
          : {
              title: "Nothing from this IDE",
              description: "Pick another filter or open a project in this IDE.",
            };
    }
  }, [filterMode, staleHiddenCount]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects across IDEs..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Projects" storeValue onChange={setFilterMode}>
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title={`All Projects (${visibleProjects.length})`} value="all" />
            <List.Dropdown.Item
              title={`Active Projects (${visibleProjects.length - missingProjects.length})`}
              value="valid_only"
              icon={Icon.CheckCircle}
            />
            {missingProjects.length > 0 && (
              <List.Dropdown.Item
                title={`Missing Projects (${missingProjects.length})`}
                value="missing_only"
                icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              />
            )}
            {hiddenPaths.length > 0 && (
              <List.Dropdown.Item
                title={`Hidden Projects (${hiddenPaths.length})`}
                value="hidden"
                icon={Icon.EyeDisabled}
              />
            )}
          </List.Dropdown.Section>

          {availableProviders.length > 0 && (
            <List.Dropdown.Section title="Filter by IDE">
              {availableProviders.map((provider) => (
                <List.Dropdown.Item key={provider.id} title={provider.name} value={provider.id} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {errorDetails ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to load projects" description={errorDetails} />
      ) : filteredProjects.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title={emptyState.title}
          description={emptyState.description}
          actions={
            <ActionPanel>
              <Action title="Reload List" icon={Icon.ArrowClockwise} onAction={loadData} />
              {hiddenPaths.length > 0 && (
                <Action
                  title={`Restore All Hidden Projects (${hiddenPaths.length})`}
                  icon={Icon.Eye}
                  onAction={handleRestoreAll}
                />
              )}
            </ActionPanel>
          }
        />
      ) : (
        filteredProjects.map((item) => {
          // Preferred editor: the first source of the entry, falling back to the
          // first registered editor.
          const primaryProviderId = item.sources[0] || allProviders[0].id;
          const primaryProvider = getProviderById(primaryProviderId) || allProviders[0];

          // The copyable command is generated for the preferred editor and
          // quoted for the shell; it is never executed as-is.
          const primaryCommand = primaryProvider.getOpenCommands(item.path)[0];
          const terminalCommand = primaryCommand ? formatOpenCommand(primaryCommand) : item.path;

          const isHidden = hiddenSet.has(item.path);

          return (
            <List.Item
              key={item.id}
              icon={getItemIcon(item)}
              title={item.name}
              subtitle={item.path}
              accessories={getSourceTags(item)}
              actions={
                <ActionPanel title="Project Actions">
                  <Action
                    title={`Open in ${primaryProvider.name}`}
                    icon={Icon.Terminal}
                    onAction={() => openProject(item, primaryProvider.id)}
                  />

                  <ActionPanel.Section title="Open With IDE">
                    {allProviders.map((provider) => {
                      const isRecentSource = item.sources.includes(provider.id);
                      return (
                        <Action
                          key={provider.id}
                          title={`Open in ${provider.name}${isRecentSource ? " (Recent)" : ""}`}
                          icon={Icon.Code}
                          shortcut={IDE_SHORTCUTS[provider.id]}
                          onAction={() => openProject(item, provider.id)}
                        />
                      );
                    })}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Actions">
                    {!isMissing(item) && <Action.ShowInFinder path={item.path} />}
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={item.path}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                    <Action.CopyToClipboard
                      title="Copy Terminal Command"
                      content={terminalCommand}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  </ActionPanel.Section>

                  {isHidden && (
                    <ActionPanel.Section title="Hidden Project">
                      <Action
                        title="Restore to List"
                        icon={Icon.Eye}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={() => handleRestore([item])}
                      />
                      <Action
                        title="Delete from IDE Databases"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete([item])}
                      />
                    </ActionPanel.Section>
                  )}

                  <ActionPanel.Section title="Maintenance">
                    {missingProjects.length > 0 && (
                      <>
                        <Action
                          title={`Delete Missing Projects from IDE Databases (${missingProjects.length})`}
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{
                            modifiers: ["cmd", "shift"],
                            key: "backspace",
                          }}
                          onAction={() => handleDelete(missingProjects)}
                        />
                        <Action
                          title={`Hide Missing Projects from List (${missingProjects.length})`}
                          icon={Icon.EyeDisabled}
                          shortcut={{
                            modifiers: ["cmd", "opt"],
                            key: "backspace",
                          }}
                          onAction={() => handleHide(missingProjects)}
                        />
                      </>
                    )}
                    {hiddenPaths.length > 0 && (
                      <Action
                        title={`Restore All Hidden Projects (${hiddenPaths.length})`}
                        icon={Icon.Eye}
                        onAction={handleRestoreAll}
                      />
                    )}
                  </ActionPanel.Section>

                  {!isHidden && (
                    <ActionPanel.Section title="Hide or Delete">
                      <Action
                        title="Hide from List"
                        icon={Icon.EyeDisabled}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={() => handleHide([item])}
                      />
                      <Action
                        title="Delete from IDE Databases and List"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete([item])}
                      />
                    </ActionPanel.Section>
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
