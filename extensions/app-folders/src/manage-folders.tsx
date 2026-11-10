import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
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
  generateFolderPreviewIcon,
  getFolderIconSource,
  getFolderPreviewIconSync,
  getHighResAppIcon,
  getHighResAppIconSync,
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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setRenderVersion] = useState(0);

  async function loadData() {
    try {
      const data = await getFolders();
      setFolders(data);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: t.errorTitle,
        message: t.loadFoldersError,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const prewarm = async () => {
      let anyGenerated = false;
      for (const f of folders) {
        for (const app of f.apps) {
          getHighResAppIconSync(app.path);
          getHighResAppIcon(app.path);
        }
        if (f.previewStyle !== "plain" && f.apps && f.apps.length > 0) {
          const cached = getFolderPreviewIconSync(f);
          if (!cached) {
            const res = await generateFolderPreviewIcon(f);
            if (res) anyGenerated = true;
          }
        }
      }
      if (anyGenerated && isMounted) {
        setRenderVersion((v) => v + 1);
      }
    };
    prewarm();
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
      await deleteFolder(folder.id);
      await showToast({
        style: Toast.Style.Success,
        title: t.folderDeleted,
        message: `'${folder.name}'`,
      });
      loadData();
    }
  }

  async function handleMoveFolder(folder: Folder, direction: "left" | "right") {
    const updated = await moveFolder(folder.id, direction);
    setFolders(updated);
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
      await resetToDefaultFolders();
      await showToast({
        style: Toast.Style.Success,
        title: t.resetFoldersSuccessToast,
      });
      loadData();
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
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateFolderForm onFolderCreated={loadData} />}
              />
              <Action.Push
                title={t.importBackup}
                icon={Icon.Upload}
                target={<ImportBackupForm onImported={loadData} />}
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
                          <AppGrid folder={folder} onUpdateFolder={loadData} />
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
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        target={<CreateFolderForm onFolderCreated={loadData} />}
                      />
                      <Action.Push
                        title={t.addApp}
                        icon={Icon.PlusCircle}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                        target={
                          <AddAppView folder={folder} onAppAdded={loadData} />
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
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        target={
                          <EditFolderForm
                            folder={folder}
                            onUpdated={loadData}
                          />
                        }
                      />
                      <Action
                        title={t.deleteFolder}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
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
                        target={<ImportBackupForm onImported={loadData} />}
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
