import { Action, ActionPanel, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import React, { useMemo, useCallback, memo } from "react";
import { Folder } from "../types";
import FolderContentsView from "../folder-contents";
import FolderEditForm from "../folder-edit-form";
import ImportFoldersForm from "./import-folders-form";
import { pluralize, getFolderIconPlain, openAllApplications, openAllWebsites } from "../utils";
import { useFoldersData, useApplicationsData, useCopyUrls } from "../hooks";
import { updateFolder } from "../storage";
import { exportFolder, exportAllFolders } from "../backup";
import { filterApplications, filterWebsites } from "../form-utils";

interface FolderItemActionsProps {
  folder: Folder;
  /** Optional callback to sync parent component after changes */
  onFolderChange?: () => void;
  /** Optional delete handler from parent (uses parent's mutate for instant optimistic update) */
  onDelete?: (folderId: string, folderName: string) => Promise<void>;
}

export const FolderItemActions = memo(function FolderItemActions({
  folder,
  onFolderChange,
  onDelete,
}: FolderItemActionsProps) {
  const { appMap } = useApplicationsData();
  const { folders: allFolders, handleSave: defaultHandleSave, handleDelete: defaultHandleDelete } = useFoldersData();

  const handleDelete = onDelete || defaultHandleDelete;

  // Use provided callback or default handleSave
  const handleSave = onFolderChange || defaultHandleSave;

  // URL copying functionality (reusable hook)
  const { hasUrls, copyAsMarkdown, copyAsList } = useCopyUrls(folder, allFolders);

  const deeplink = useMemo(
    () =>
      createDeeplink({
        command: "index",
        context: { folderId: folder.id, folderName: folder.name },
      }),
    [folder.id, folder.name],
  );

  // Get the folder's custom icon for the quicklink (plain Icon, without color tinting)
  const folderIcon = useMemo(() => getFolderIconPlain(folder.icon), [folder.icon]);

  // Filter items by type once for efficiency
  const { appItems, websiteItems, hasApps, hasWebsites } = useMemo(() => {
    const apps = filterApplications(folder.items);
    const websites = filterWebsites(folder.items);
    return {
      appItems: apps,
      websiteItems: websites,
      hasApps: apps.length > 0,
      hasWebsites: websites.length > 0,
    };
  }, [folder.items]);

  const handleOpenAllApps = useCallback(
    () => openAllApplications(appItems, folder.name, appMap),
    [appItems, folder.name, appMap],
  );

  const handleOpenAllWebsites = useCallback(
    () => openAllWebsites(websiteItems, folder.name),
    [websiteItems, folder.name],
  );

  const handleEmptyFolder = useCallback(async () => {
    if (folder.items.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Bundle is already empty",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Empty Bundle",
      message: `Remove all ${folder.items.length} ${pluralize(folder.items.length, "item")} from "${folder.name}"? The bundle itself will be kept.`,
      primaryAction: {
        title: "Empty Bundle",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await updateFolder(folder.id, { items: [] });
    await handleSave();

    await showToast({
      style: Toast.Style.Success,
      title: "Bundle emptied",
      message: `Removed ${folder.items.length} ${pluralize(folder.items.length, "item")}`,
    });
  }, [folder.id, folder.name, folder.items.length, handleSave]);

  return (
    <ActionPanel>
      {/* Primary Action */}
      <ActionPanel.Section>
        <Action.Push
          title="Open Bundle"
          icon={Icon.ArrowRight}
          target={<FolderContentsView folderId={folder.id} folderName={folder.name} />}
          onPop={handleSave}
        />
      </ActionPanel.Section>

      {/* Open All */}
      {(hasApps || hasWebsites) && (
        <ActionPanel.Section title="Open All">
          {hasApps && (
            <Action
              title="Open All Applications"
              icon={Icon.AppWindow}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={handleOpenAllApps}
            />
          )}
          {hasWebsites && (
            <Action
              title="Open All Websites"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              onAction={handleOpenAllWebsites}
            />
          )}
        </ActionPanel.Section>
      )}

      {/* Copy URLs */}
      {hasUrls && (
        <ActionPanel.Section title="Copy URLs">
          <Action
            title="Copy as Markdown"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            onAction={copyAsMarkdown}
          />
          <Action
            title="Copy as List"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            onAction={copyAsList}
          />
        </ActionPanel.Section>
      )}

      {/* Organize */}
      <ActionPanel.Section title="Organize">
        <Action.Push
          title="Edit Bundle"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<FolderEditForm folder={folder} onSave={handleSave} navigateToFolderAfterSave={false} />}
          onPop={handleSave}
        />
        <Action.Push
          title="Create New Bundle"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<FolderEditForm onSave={handleSave} navigateToFolderAfterSave={false} />}
          onPop={handleSave}
        />
      </ActionPanel.Section>

      {/* Quicklinks */}
      <ActionPanel.Section title="Quicklinks">
        <Action.CreateQuicklink
          title="Create Quicklink"
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          quicklink={{
            name: `Open ${folder.name}`,
            link: deeplink,
            icon: folderIcon,
          }}
        />
        <Action.CopyToClipboard
          title="Copy Quicklink URL"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          content={deeplink}
        />
      </ActionPanel.Section>

      {/* Backup */}
      <ActionPanel.Section title="Backup">
        <Action
          title="Export This Bundle"
          icon={Icon.Upload}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => exportFolder(folder)}
        />
        <Action title="Export All Bundles" icon={Icon.Upload} onAction={exportAllFolders} />
        <Action.Push title="Import Bundles" icon={Icon.Download} target={<ImportFoldersForm />} onPop={handleSave} />
      </ActionPanel.Section>

      {/* Danger Zone */}
      <ActionPanel.Section title="Danger Zone">
        {folder.items.length > 0 && (
          <Action
            title="Empty Bundle"
            icon={Icon.Eraser}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
            onAction={handleEmptyFolder}
          />
        )}
        <Action
          title="Delete Bundle"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => handleDelete(folder.id, folder.name)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
});
