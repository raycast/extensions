import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
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
  moveFolder,
  resetToDefaultFolders,
} from "./utils/storage";

/**
 * Command for managing, reordering, and configuring app folders.
 */
export default function ManageFolders() {
  const [, setRenderVersion] = useState(0);
  const { data: folders = [], isLoading, revalidate } = usePromise(getFolders);

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

  async function handleDelete(folder: Folder) {
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t.searchFoldersPlaceholder}
    >
      {folders.length === 0 ? (
        <List.EmptyView
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
        <List.Section title={`${t.allFoldersTitle} (${folders.length})`}>
          {folders.map((folder) => {
            const slotText = folder.slot ? t.slotN(folder.slot) : t.noSlot;
            const itemIcon = getFolderIconSource(folder);
            const itemTitle = formatFolderTitle(folder);

            return (
              <List.Item
                key={folder.id}
                title={itemTitle}
                subtitle={t.appsCount(folder.apps.length)}
                keywords={[
                  folder.name,
                  ...folder.apps.map((a) => a.name),
                  ...folder.apps.flatMap((a) => a.keywords || []),
                ]}
                icon={itemIcon}
                accessories={[{ text: slotText }]}
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
                        title={t.moveUp}
                        icon={Icon.ArrowUp}
                        shortcut={{ modifiers: ["opt"], key: "arrowUp" }}
                        onAction={() => handleMoveFolder(folder, "left")}
                      />
                      <Action
                        title={t.moveDown}
                        icon={Icon.ArrowDown}
                        shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
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
                        onAction={() => handleDelete(folder)}
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
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
