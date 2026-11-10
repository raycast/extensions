import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { AppItem, Folder } from "../types";
import { launchAllApps, launchApp } from "../utils/apps";
import { t } from "../utils/i18n";
import {
  getFolderIconSource,
  getHighResAppIcon,
  getHighResAppIconSync,
} from "../utils/iconExtractor";
import {
  formatFolderTitle,
  getFolders,
  getShowShortcutHints,
  moveAppInFolder,
  moveAppToAnotherFolder,
  removeAppFromFolder,
  setShowShortcutHints,
} from "../utils/storage";
import { AddAppView } from "./AddAppView";
import { CreateFolderForm } from "./CreateFolderForm";
import { EditFolderForm } from "./EditFolderForm";

interface AppGridProps {
  folder: Folder;
  onUpdateFolder?: () => void;
}

/**
 * Grid view displaying applications inside an app folder.
 */
export function AppGrid({ folder, onUpdateFolder }: AppGridProps) {
  const { pop } = useNavigation();
  const [currentFolder, setCurrentFolder] = useState<Folder>(folder);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [showShortcutHints, setShowShortcutHintsState] = useState(true);
  const [asyncFallbackIcons, setAsyncFallbackIcons] = useState<
    Record<string, string>
  >({});

  // Sync local state when parent folder prop updates
  useEffect(() => {
    setCurrentFolder(folder);
    getFolders().then(setAllFolders);
    getShowShortcutHints().then(setShowShortcutHintsState);
  }, [folder]);

  async function handleToggleShortcutHints() {
    const next = !showShortcutHints;
    setShowShortcutHintsState(next);
    await setShowShortcutHints(next);
    await showToast({
      style: Toast.Style.Success,
      title: next ? t.shortcutHintsEnabledToast : t.shortcutHintsDisabledToast,
    });
  }

  // Fallback to async NSWorkspace extraction for apps without .icns (Assets.car only)
  useEffect(() => {
    let isMounted = true;
    async function loadFallbackIcons() {
      const missingApps = currentFolder.apps.filter(
        (a) => !getHighResAppIconSync(a.path) && !asyncFallbackIcons[a.path],
      );
      if (missingApps.length === 0) return;

      const results = await Promise.all(
        missingApps.map(async (app) => ({
          path: app.path,
          icon: await getHighResAppIcon(app.path),
        })),
      );

      if (isMounted) {
        setAsyncFallbackIcons((prev) => {
          let updated = false;
          const next = { ...prev };
          for (const item of results) {
            if (item.icon && next[item.path] !== item.icon) {
              next[item.path] = item.icon;
              updated = true;
            }
          }
          return updated ? next : prev;
        });
      }
    }
    loadFallbackIcons();
    return () => {
      isMounted = false;
    };
  }, [currentFolder.apps]);

  /**
   * Refreshes folder state from LocalStorage when children views update data.
   */
  async function handleDataChanged() {
    const freshFolders = await getFolders();
    setAllFolders(freshFolders);
    const refreshed = freshFolders.find((f) => f.id === currentFolder.id);
    if (refreshed) {
      setCurrentFolder(refreshed);
    }
    if (onUpdateFolder) {
      onUpdateFolder();
    }
  }

  async function handleMoveAppToFolder(
    app: AppItem,
    targetFolderId: string,
    targetFolderName: string,
  ) {
    const result = await moveAppToAnotherFolder(
      currentFolder.id,
      targetFolderId,
      app.path,
    );
    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: t.appMovedTitle,
        message: t.appMovedMessage(app.name, targetFolderName),
      });
      await handleDataChanged();
    }
  }

  async function handleRemoveApp(app: AppItem) {
    await removeAppFromFolder(currentFolder.id, app.path);
    setCurrentFolder((prev) => ({
      ...prev,
      apps: prev.apps.filter((a) => a.path !== app.path),
    }));
    await showToast({
      style: Toast.Style.Success,
      title: t.appRemovedTitle,
      message: t.appRemovedMessage(app.name),
    });
    if (onUpdateFolder) onUpdateFolder();
  }

  async function handleMoveApp(app: AppItem, direction: "left" | "right") {
    const updated = await moveAppInFolder(
      currentFolder.id,
      app.path,
      direction,
    );
    if (updated) {
      setCurrentFolder(updated);
      if (onUpdateFolder) onUpdateFolder();
    }
  }

  const sectionTitle = formatFolderTitle(currentFolder);

  return (
    <Grid
      columns={6}
      aspectRatio="1"
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Small}
      searchBarPlaceholder={t.searchFolderAppsPlaceholder(currentFolder.name)}
    >
      {currentFolder.apps.length === 0 ? (
        <Grid.EmptyView
          icon={getFolderIconSource(currentFolder)}
          title={t.emptyFolderTitle(currentFolder.name)}
          description={t.emptyFolderDesc}
          actions={
            <ActionPanel>
              <Action.Push
                title={t.addApp}
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={
                  <AddAppView
                    folder={currentFolder}
                    onAppAdded={handleDataChanged}
                  />
                }
              />
              <Action.Push
                title={t.folderSettings}
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={
                  <EditFolderForm
                    folder={currentFolder}
                    onUpdated={handleDataChanged}
                  />
                }
              />
              <Action title={t.back} icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />
      ) : (
        <Grid.Section
          title={sectionTitle}
          subtitle={t.appsCount(currentFolder.apps.length)}
        >
          {currentFolder.apps.map((app, index) => {
            // Return synchronous 512x512 cached icon from frame 0 to eliminate layout shifts
            const resolvedIconPath =
              getHighResAppIconSync(app.path) || asyncFallbackIcons[app.path];
            const iconContent = resolvedIconPath
              ? { source: resolvedIconPath }
              : { fileIcon: app.path };

            return (
              <Grid.Item
                key={app.id}
                title={app.name}
                subtitle={
                  showShortcutHints && index < 9 ? `⌘${index + 1}` : undefined
                }
                keywords={app.keywords}
                content={iconContent}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={t.launchSection}>
                      <Action
                        title={t.launchApp(app.name)}
                        icon={Icon.Play}
                        onAction={() => launchApp(app)}
                      />
                      {currentFolder.apps.length > 1 && (
                        <Action
                          title={t.openAllApps}
                          icon={Icon.Rocket}
                          shortcut={{
                            modifiers: ["cmd", "shift"],
                            key: "return",
                          }}
                          onAction={() =>
                            launchAllApps(
                              currentFolder.apps,
                              currentFolder.name,
                            )
                          }
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section title={t.quickLaunchSection}>
                      {currentFolder.apps.slice(0, 9).map((targetApp, idx) => (
                        <Action
                          key={`quick_launch_${targetApp.id}`}
                          title={t.launchApp(targetApp.name)}
                          icon={Icon.Play}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: `${idx + 1}` as Keyboard.KeyEquivalent,
                          }}
                          onAction={() => launchApp(targetApp)}
                        />
                      ))}
                    </ActionPanel.Section>

                    <ActionPanel.Section title={t.appManagementSection}>
                      <Action.Push
                        title={t.addApp}
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        target={
                          <AddAppView
                            folder={currentFolder}
                            onAppAdded={handleDataChanged}
                          />
                        }
                      />
                      {allFolders.filter((f) => f.id !== currentFolder.id)
                        .length > 0 && (
                        <ActionPanel.Submenu
                          title={t.moveToFolder}
                          icon={Icon.Folder}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                        >
                          {allFolders
                            .filter((f) => f.id !== currentFolder.id)
                            .map((target) => (
                              <Action
                                key={`move_to_${target.id}`}
                                title={target.name}
                                icon={getFolderIconSource(target)}
                                onAction={() =>
                                  handleMoveAppToFolder(
                                    app,
                                    target.id,
                                    target.name,
                                  )
                                }
                              />
                            ))}
                        </ActionPanel.Submenu>
                      )}
                      <Action
                        title={t.moveLeft}
                        icon={Icon.ArrowLeft}
                        shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
                        onAction={() => handleMoveApp(app, "left")}
                      />
                      <Action
                        title={t.moveRight}
                        icon={Icon.ArrowRight}
                        shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
                        onAction={() => handleMoveApp(app, "right")}
                      />
                      <Action
                        title={t.removeApp}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={() => handleRemoveApp(app)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title={t.folderManagementSection}>
                      <Action.Push
                        title={t.createFolder}
                        icon={Icon.Folder}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                        target={
                          <CreateFolderForm
                            onFolderCreated={handleDataChanged}
                          />
                        }
                      />
                      <Action.Push
                        title={t.folderSettings}
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        target={
                          <EditFolderForm
                            folder={currentFolder}
                            onUpdated={handleDataChanged}
                          />
                        }
                      />
                      <Action.ShowInFinder path={app.path} />
                      <Action
                        title={t.back}
                        icon={Icon.ArrowLeft}
                        shortcut={{ modifiers: ["cmd"], key: "escape" }}
                        onAction={pop}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action
                        title={
                          showShortcutHints
                            ? t.hideShortcutHintsAction
                            : t.showShortcutHintsAction
                        }
                        icon={showShortcutHints ? Icon.EyeDisabled : Icon.Eye}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                        onAction={handleToggleShortcutHints}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
