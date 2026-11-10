import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Grid,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { AddAppView } from "./components/AddAppView";
import { AppGrid } from "./components/AppGrid";
import { CreateFolderForm } from "./components/CreateFolderForm";
import { EditFolderForm } from "./components/EditFolderForm";
import { ImportBackupForm } from "./components/ImportBackupForm";
import { Folder } from "./types";
import { launchAllApps } from "./utils/apps";
import { t } from "./utils/i18n";
import {
  getFolderIconSource,
  prewarmFoldersIcons,
} from "./utils/iconExtractor";
import {
  deleteFolder,
  formatFolderTitle,
  getFolders,
  getShowShortcutHints,
  moveFolder,
  resetToDefaultFolders,
  setShowShortcutHints,
} from "./utils/storage";

/**
 * All App Folders main dashboard command.
 */
export default function Command() {
  const [, setRenderVersion] = useState(0);

  const {
    data: dashboardData,
    isLoading,
    revalidate,
  } = usePromise(async () => {
    const [folders, showShortcutHints] = await Promise.all([
      getFolders(),
      getShowShortcutHints(),
    ]);
    return { folders, showShortcutHints };
  });

  const folders = dashboardData?.folders ?? [];
  const showShortcutHints = dashboardData?.showShortcutHints ?? true;

  useEffect(() => {
    if (folders.length === 0) return;
    let isMounted = true;
    prewarmFoldersIcons(folders).then((anyGenerated) => {
      if (anyGenerated && isMounted) {
        setRenderVersion((v) => v + 1);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [folders]);

  async function handleDeleteFolder(folder: Folder) {
    const confirmed = await confirmAlert({
      title: t.deleteFolderConfirmTitle(folder.name),
      message: t.deleteFolderConfirmMessage,
      primaryAction: {
        title: t.delete,
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteFolder(folder.id);
        await showToast({
          style: Toast.Style.Success,
          title: t.folderDeleted,
          message: `'${folder.name}'`,
        });
        await revalidate();
      } catch (err) {
        await showFailureToast(err, { title: t.errorTitle });
      }
    }
  }

  async function handleMoveFolder(folder: Folder, direction: "left" | "right") {
    try {
      await moveFolder(folder.id, direction);
      await revalidate();
    } catch (err) {
      await showFailureToast(err, { title: t.errorTitle });
    }
  }

  async function handleToggleShortcutHints() {
    try {
      const next = !showShortcutHints;
      await setShowShortcutHints(next);
      await revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: next
          ? t.shortcutHintsEnabledToast
          : t.shortcutHintsDisabledToast,
      });
    } catch (err) {
      await showFailureToast(err, { title: t.errorTitle });
    }
  }

  async function handleResetFolders() {
    const confirmed = await confirmAlert({
      title: t.resetFoldersConfirmTitle,
      message: t.resetFoldersConfirmMessage,
      primaryAction: {
        title: t.resetFoldersAction,
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await resetToDefaultFolders();
        await showToast({
          style: Toast.Style.Success,
          title: t.resetFoldersSuccessToast,
        });
        await revalidate();
      } catch (err) {
        await showFailureToast(err, { title: t.errorTitle });
      }
    }
  }

  if (isLoading) {
    return <Grid isLoading={true} />;
  }

  return (
    <Grid
      columns={6}
      aspectRatio="1"
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Small}
      searchBarPlaceholder={t.searchFoldersPlaceholder}
    >
      {folders.length === 0 ? (
        <Grid.EmptyView
          icon={{ source: "glass_folder.png" }}
          title={t.emptyFoldersTitle}
          description={t.emptyFoldersDesc}
          actions={
            <ActionPanel>
              <Action.Push
                title={t.createFolder}
                icon={Icon.Plus}
                target={<CreateFolderForm onFolderCreated={revalidate} />}
              />
              <Action.Push
                title={t.importBackup}
                icon={Icon.Upload}
                target={<ImportBackupForm onImported={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <Grid.Section title={`${t.allFoldersTitle} (${folders.length})`}>
          {folders.map((folder, idx) => {
            const previewIcon = getFolderIconSource(folder);
            const folderTitle = formatFolderTitle(folder);
            const shortcutHint =
              showShortcutHints && idx < 9 ? `⌘${idx + 1}` : undefined;
            // Enable searching folders by the names and keywords of apps contained within them
            const searchKeywords = [
              folder.name,
              ...folder.apps.map((a) => a.name),
              ...folder.apps.flatMap((a) => a.keywords || []),
            ];

            return (
              <Grid.Item
                key={folder.id}
                title={folderTitle}
                subtitle={shortcutHint}
                keywords={searchKeywords}
                content={previewIcon}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={t.openSection}>
                      <Action.Push
                        title={t.openFolder}
                        icon={Icon.ArrowRight}
                        target={
                          <AppGrid
                            folder={folder}
                            onUpdateFolder={revalidate}
                          />
                        }
                      />
                      <Action.Push
                        title={t.addApp}
                        icon={Icon.PlusCircle}
                        target={
                          <AddAppView folder={folder} onAppAdded={revalidate} />
                        }
                      />
                      {folder.apps.length > 0 && (
                        <Action
                          title={t.openAllApps}
                          icon={Icon.Rocket}
                          shortcut={{
                            modifiers: ["cmd", "shift"],
                            key: "return",
                          }}
                          onAction={() =>
                            launchAllApps(folder.apps, folder.name)
                          }
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section title={t.quickOpenSection}>
                      {folders.slice(0, 9).map((targetFolder, idx) => (
                        <Action.Push
                          key={`quick_open_${targetFolder.id}`}
                          title={targetFolder.name}
                          icon={Icon.ArrowRight}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: `${idx + 1}` as Keyboard.KeyEquivalent,
                          }}
                          target={
                            <AppGrid
                              folder={targetFolder}
                              onUpdateFolder={revalidate}
                            />
                          }
                        />
                      ))}
                    </ActionPanel.Section>

                    <ActionPanel.Section title={t.folderManagementSection}>
                      <Action.Push
                        title={t.createFolder}
                        icon={Icon.Plus}
                        shortcut={Keyboard.Shortcut.Common.New}
                        target={
                          <CreateFolderForm onFolderCreated={revalidate} />
                        }
                      />
                      <Action
                        title={t.moveLeft}
                        icon={Icon.ArrowLeft}
                        shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
                        onAction={() => handleMoveFolder(folder, "left")}
                      />
                      <Action
                        title={t.moveRight}
                        icon={Icon.ArrowRight}
                        shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
                        onAction={() => handleMoveFolder(folder, "right")}
                      />
                      <Action.Push
                        title={t.folderSettings}
                        icon={Icon.Pencil}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        target={
                          <EditFolderForm
                            folder={folder}
                            onUpdated={revalidate}
                          />
                        }
                      />
                      <Action
                        title={t.deleteFolder}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => handleDeleteFolder(folder)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title={t.backupSection}>
                      <Action.CopyToClipboard
                        title={t.exportBackup}
                        icon={Icon.Download}
                        content={JSON.stringify(folders, null, 2)}
                        onCopy={() => {
                          showToast({
                            style: Toast.Style.Success,
                            title: t.exportSuccessTitle,
                            message: t.exportSuccessMessage(folders.length),
                          });
                        }}
                      />
                      <Action.Push
                        title={t.importBackup}
                        icon={Icon.Upload}
                        target={<ImportBackupForm onImported={revalidate} />}
                      />
                      <Action
                        title={t.resetFoldersAction}
                        icon={Icon.ArrowClockwise}
                        style={Action.Style.Destructive}
                        onAction={handleResetFolders}
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
