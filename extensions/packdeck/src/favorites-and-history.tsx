import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { InstallPackageForm } from "./components/InstallPackageForm";
import { PackageDetailView } from "./components/PackageDetailView";
import { PACKAGE_MANAGER_META } from "./lib/constants";
import { execCommand } from "./lib/env";
import { formatDuration, formatRelativeTime } from "./lib/format";
import { notifyOperationResult } from "./lib/notifications";
import { buildInstallCommand, executeInstall } from "./lib/package-manager";
import {
  clearHistory,
  getFavorites,
  getHistory,
  recordHistory,
  removeFavorite,
  removeHistoryEntry,
} from "./lib/storage";
import { runCommandInTerminal } from "./lib/terminal";
import { useProjects } from "./lib/useProjects";
import { FavoritePackage, HistoryEntry, PackageManagerName, TerminalApp } from "./types";

type SectionFilter = "all" | "favorites" | "history";

const ALLOWED_BINS = new Set<PackageManagerName>(["npm", "pnpm", "yarn", "bun"]);

function resolveHistoryInvocation(entry: HistoryEntry): { bin: PackageManagerName; args: string[] } {
  const bin: PackageManagerName = ALLOWED_BINS.has(entry.packageManager) ? entry.packageManager : "npm";
  if (Array.isArray(entry.args) && entry.args.length > 0) {
    return { bin, args: entry.args };
  }
  const parts = entry.command.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const cleaned = parts.map((p) => p.replace(/^"|"$/g, ""));
  return { bin, args: cleaned.slice(1) };
}

export default function FavoritesAndHistoryCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [filter, setFilter] = useState<SectionFilter>("all");
  const { activeProject } = useProjects();

  const { data: favorites, isLoading: loadingFavs, revalidate: revalidateFavs } = usePromise(getFavorites);
  const { data: history, isLoading: loadingHist, revalidate: revalidateHist } = usePromise(getHistory);

  const favList = favorites ?? [];
  const histList = history ?? [];

  const showFavs = filter === "all" || filter === "favorites";
  const showHist = filter === "all" || filter === "history";

  async function handleQuickInstallFavorite(fav: FavoritePackage, isGlobal: boolean) {
    if (!isGlobal && !activeProject) {
      await showToast({ style: Toast.Style.Failure, title: "No active project selected" });
      return;
    }

    const pm: PackageManagerName = isGlobal
      ? prefs.defaultPackageManager && prefs.defaultPackageManager !== "auto"
        ? (prefs.defaultPackageManager as PackageManagerName)
        : "npm"
      : activeProject!.packageManager;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${fav.name}...`,
      message: isGlobal ? `Global (${pm})` : `${activeProject!.name} (${pm})`,
    });

    const outcome = await executeInstall({
      pm,
      packageName: fav.name,
      projectPath: isGlobal ? undefined : activeProject?.path,
      projectName: isGlobal ? undefined : activeProject?.name,
      isGlobal,
      depType: "prod",
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Installed ${fav.name}` : `Install failed for ${fav.name}`,
      message: outcome.success ? `${outcome.command} · ${formatDuration(outcome.durationMs)}` : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    await revalidateHist();
  }

  async function handleRemoveFavorite(name: string) {
    const ok = await confirmAlert({
      title: `Remove "${name}" from Favorites?`,
      message: "You can re-bookmark this package later from package search or details.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;

    await removeFavorite(name);
    await revalidateFavs();
    await showToast({ style: Toast.Style.Success, title: `Removed ${name} from Favorites` });
  }

  async function handleRemoveHistoryEntry(entry: HistoryEntry) {
    const ok = await confirmAlert({
      title: "Remove command history entry?",
      message: `Permanently delete "${entry.command}" from Packdeck history.`,
      primaryAction: { title: "Remove Entry", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;

    await removeHistoryEntry(entry.id);
    await revalidateHist();
    await showToast({ style: Toast.Style.Success, title: "Removed history entry" });
  }

  async function handleReplayHistory(entry: HistoryEntry) {
    const ok = await confirmAlert({
      title: `Re-run "${entry.command}"?`,
      message: entry.isGlobal
        ? "Executes globally."
        : `Executes in ${entry.projectName ?? entry.projectPath ?? "project"}.`,
      primaryAction: { title: "Re-Run Command", style: Alert.ActionStyle.Default },
    });
    if (!ok) return;

    const { bin, args } = resolveHistoryInvocation(entry);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Re-running ${entry.command}...`,
    });

    const res = await execCommand(bin, args, {
      cwd: entry.isGlobal ? undefined : entry.projectPath,
      additionalPath: prefs.additionalPath,
      timeoutMs: 180_000,
    });

    await recordHistory({
      action: entry.action,
      packageName: entry.packageName,
      version: entry.version,
      projectPath: entry.projectPath,
      projectName: entry.projectName,
      isGlobal: entry.isGlobal,
      packageManager: bin,
      command: entry.command,
      args,
      success: res.exitCode === 0,
      durationMs: res.durationMs,
      errorMessage: res.exitCode === 0 ? undefined : res.stderr.trim().slice(0, 200),
    });

    await toast.hide();
    await notifyOperationResult({
      title: res.exitCode === 0 ? `Re-ran ${entry.command}` : "Command failed",
      message: res.exitCode === 0 ? formatDuration(res.durationMs) : res.stderr.trim().slice(0, 160),
      success: res.exitCode === 0,
      durationMs: res.durationMs,
    });

    await revalidateHist();
  }

  async function handleClearHistory() {
    const ok = await confirmAlert({
      title: "Clear all command history?",
      message: "This removes all recorded package installation and script execution history.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;

    await clearHistory();
    await revalidateHist();
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  const isEmpty = (!showFavs || favList.length === 0) && (!showHist || histList.length === 0);

  return (
    <List
      isLoading={loadingFavs || loadingHist}
      searchBarPlaceholder="Search favorites and command history..."
      searchBarAccessory={
        <List.Dropdown tooltip="View Filter" value={filter} onChange={(v) => setFilter(v as SectionFilter)}>
          <List.Dropdown.Item title={`All (${favList.length + histList.length})`} value="all" />
          <List.Dropdown.Item title={`Favorites (${favList.length})`} value="favorites" icon={Icon.Star} />
          <List.Dropdown.Item title={`Command History (${histList.length})`} value="history" icon={Icon.Clock} />
        </List.Dropdown>
      }
    >
      {!loadingFavs && !loadingHist && isEmpty ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No Favorites or History Yet"
          description="Bookmark packages with ⌘F while searching or run package installations to populate your history."
        />
      ) : (
        <>
          {showFavs && favList.length > 0 && (
            <List.Section title="Favorite Packages" subtitle={`${favList.length} bookmarked`}>
              {favList.map((fav) => (
                <List.Item
                  key={`fav-${fav.name}`}
                  icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                  title={fav.name}
                  subtitle={fav.description}
                  accessories={[
                    ...(fav.version ? [{ tag: `v${fav.version}` }] : []),
                    { text: formatRelativeTime(fav.addedAt), tooltip: "Saved" },
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Package">
                        <Action.Push
                          title="View Package Details & README"
                          icon={Icon.Document}
                          target={<PackageDetailView packageName={fav.name} activeProject={activeProject} />}
                        />
                        <Action.Push
                          title="Install Package (Options)…"
                          icon={Icon.Download}
                          target={<InstallPackageForm packageName={fav.name} defaultProject={activeProject} />}
                        />
                        {activeProject && (
                          <Action
                            title={`Quick Install to ${activeProject.name}`}
                            icon={Icon.Plus}
                            shortcut={{ modifiers: ["cmd"], key: "i" }}
                            onAction={() => handleQuickInstallFavorite(fav, false)}
                          />
                        )}
                        <Action
                          title="Install Globally"
                          icon={Icon.Globe}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
                          onAction={() => handleQuickInstallFavorite(fav, true)}
                        />
                      </ActionPanel.Section>

                      <ActionPanel.Section title="Manage">
                        <Action.CopyToClipboard
                          title="Copy Install Command"
                          content={buildInstallCommand(activeProject?.packageManager ?? "npm", fav.name).display}
                        />
                        <Action.OpenInBrowser
                          title="Open on npm"
                          url={fav.links?.npm ?? `https://www.npmjs.com/package/${fav.name}`}
                        />
                        <Action
                          title="Remove from Favorites"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() => handleRemoveFavorite(fav.name)}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {showHist && histList.length > 0 && (
            <List.Section title="Command History" subtitle={`${histList.length} recorded`}>
              {histList.map((entry) => {
                const pmMeta = PACKAGE_MANAGER_META[entry.packageManager];
                const scopeLabel = entry.isGlobal ? "Global" : (entry.projectName ?? "Project");
                const invocation = resolveHistoryInvocation(entry);

                return (
                  <List.Item
                    key={entry.id}
                    icon={{
                      source: entry.success ? Icon.CheckCircle : Icon.XMarkCircle,
                      tintColor: entry.success ? Color.Green : Color.Red,
                    }}
                    title={entry.command}
                    subtitle={entry.errorMessage ? `Error: ${entry.errorMessage}` : scopeLabel}
                    keywords={[entry.packageName ?? "", entry.projectName ?? "", entry.packageManager, entry.action]}
                    accessories={[
                      { text: formatDuration(entry.durationMs) },
                      { tag: { value: pmMeta.label, color: pmMeta.color } },
                      { text: formatRelativeTime(entry.timestamp) },
                    ]}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title="Replay & Copy">
                          <Action
                            title="Re-Run Command"
                            icon={Icon.ArrowClockwise}
                            onAction={() => handleReplayHistory(entry)}
                          />
                          <Action.CopyToClipboard
                            title="Copy Command"
                            content={entry.command}
                            shortcut={Keyboard.Shortcut.Common.Copy}
                          />
                          {entry.projectPath && (
                            <Action
                              title={`Run in ${prefs.preferredTerminal ?? "Terminal"}`}
                              icon={Icon.Terminal}
                              shortcut={{ modifiers: ["cmd"], key: "t" }}
                              onAction={() =>
                                runCommandInTerminal(
                                  entry.projectPath!,
                                  { bin: invocation.bin, args: invocation.args, display: entry.command },
                                  (prefs.preferredTerminal as TerminalApp) ?? "Terminal",
                                )
                              }
                            />
                          )}
                          {entry.packageName && entry.action !== "script" && (
                            <Action.Push
                              title={`View ${entry.packageName} Details`}
                              icon={Icon.Document}
                              target={
                                <PackageDetailView packageName={entry.packageName} activeProject={activeProject} />
                              }
                            />
                          )}
                        </ActionPanel.Section>

                        <ActionPanel.Section title="Clean Up">
                          <Action
                            title="Remove Entry"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={Keyboard.Shortcut.Common.Remove}
                            onAction={() => handleRemoveHistoryEntry(entry)}
                          />
                          <Action
                            title="Clear All History"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={handleClearHistory}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
