import {
  Alert,
  closeMainWindow,
  Color,
  confirmAlert,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useSyncFolders } from "./hooks";
import { SyncFolders } from "./types";
import { lastSyncDate } from "./utils";

export default function Command() {
  const { syncFolders, runSyncFolders, isLoading } = useSyncFolders();

  const [syncFoldersWithDelete, setSyncFoldersWithDelete] = useState<SyncFolders[]>();
  const [syncFoldersWithoutDelete, setSyncFoldersWithoutDelete] = useState<SyncFolders[]>();

  useEffect(() => {
    if (!syncFolders || syncFolders.length === 0) {
      return;
    }
    setSyncFoldersWithDelete(syncFolders.filter((syncFolder) => syncFolder.delete_dest));
    setSyncFoldersWithoutDelete(syncFolders.filter((syncFolder) => !syncFolder.delete_dest));
  }, [syncFolders]);

  /**
   * Handles the synchronization of folders by confirming the action with the user.
   * If the user confirms, it runs the synchronization process.
   *
   * @param {string | undefined} id - The identifier for the folder synchronization process.
   * @returns {Promise<void>} A promise that resolves when the synchronization process is complete.
   */
  async function handleRunSyncFolders(id: string | undefined): Promise<void> {
    if (!id) {
      return;
    }

    await confirmAlert({
      title: "Sync Folders",
      message: "Are you sure you want to Sync Folders?",
      icon: { source: Icon.Warning, tintColor: Color.Red },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
        onAction: () => closeMainWindow(),
      },
      primaryAction: {
        title: "Sync",
        style: Alert.ActionStyle.Default,
        onAction: () => {
          runSyncFolders(id as string);
          closeMainWindow();
        },
      },
    });
  }

  /**
   * Handles the synchronization of all folders by displaying a confirmation alert.
   * If the user confirms, it triggers the synchronization process for each folder.
   *
   * @async
   * @function handleSyncAllFolders
   * @returns {Promise<void>} A promise that resolves when the synchronization process is complete.
   */
  async function handleSyncAllFolders() {
    await confirmAlert({
      title: "Sync All Folders",
      message: "Are you sure you want to Sync All Folders?",
      icon: { source: Icon.Warning, tintColor: Color.Red },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
        onAction: () => closeMainWindow(),
      },
      primaryAction: {
        title: "Sync",
        style: Alert.ActionStyle.Default,
        onAction: () => {
          syncFolders?.forEach(({ id }) => runSyncFolders(id as string));
          closeMainWindow();
        },
      },
    });
  }

  /**
   * Handles the synchronization of all folders without deleting any files.
   *
   * This function prompts the user with a confirmation alert before proceeding with the synchronization.
   * If the user confirms, it will iterate through the `syncFoldersWithoutDelete` array and run the synchronization
   * for each folder by calling `runSyncFolders` with the folder's ID.
   *
   * The alert has two actions:
   * - Cancel: Closes the main window without performing any action.
   * - Sync: Executes the synchronization and then closes the main window.
   *
   * @async
   * @function handleSyncAllFoldersWithoutDelete
   * @returns {Promise<void>} A promise that resolves when the synchronization process is complete.
   */
  async function handleSyncAllFoldersWithoutDelete() {
    await confirmAlert({
      title: "Sync All Folders without Delete",
      message: "Are you sure you want to Sync All Folders without Delete?",
      icon: { source: Icon.Warning, tintColor: Color.Red },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
        onAction: () => closeMainWindow(),
      },
      primaryAction: {
        title: "Sync",
        style: Alert.ActionStyle.Default,
        onAction: () => {
          syncFoldersWithoutDelete?.forEach(({ id }) => runSyncFolders(id as string));
          closeMainWindow();
        },
      },
    });
  }

  /**
   * Handles the synchronization of all folders with the option to delete.
   * This function prompts the user with a confirmation alert before proceeding.
   * If the user confirms, it will run the synchronization process for each folder
   * and then close the main window.
   *
   * @async
   * @function handleSyncAllFoldersWithDelete
   * @returns {Promise<void>} A promise that resolves when the synchronization process is complete.
   */
  async function handleSyncAllFoldersWithDelete() {
    await confirmAlert({
      title: "Sync All Folders with Delete",
      message: "Are you sure you want to Sync All Folders with Delete?",
      icon: { source: Icon.Warning, tintColor: Color.Red },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
        onAction: () => closeMainWindow(),
      },
      primaryAction: {
        title: "Sync",
        style: Alert.ActionStyle.Default,
        onAction: () => {
          syncFoldersWithDelete?.forEach(({ id }) => runSyncFolders(id as string));
          closeMainWindow();
        },
      },
    });
  }

  return (
    <MenuBarExtra isLoading={isLoading} icon={`extension-icon.svg`} tooltip="Sync Folders">
      {syncFoldersWithoutDelete && syncFoldersWithoutDelete.length > 0 && (
        <MenuBarExtra.Section title="Sync Folders without Delete">
          {syncFoldersWithoutDelete.map(({ id, icon, name, last_sync }) => (
            <MenuBarExtra.Item
              key={id}
              title={`⇅ ${name as string}`}
              subtitle={` ⋯ Last Sync: ${lastSyncDate(last_sync)}`}
              icon={{ source: icon ? Icon[icon as keyof typeof Icon] : Icon.Folder, tintColor: Color.Green }}
              onAction={() => handleRunSyncFolders(id as string)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {syncFoldersWithDelete && syncFoldersWithDelete.length > 0 && (
        <MenuBarExtra.Section title="Sync Folders with Delete">
          {syncFoldersWithDelete.map(({ id, icon, name, last_sync }) => (
            <MenuBarExtra.Item
              key={id}
              title={`⇅ ${name as string}`}
              subtitle={` ⋯ Last Sync: ${lastSyncDate(last_sync)}`}
              icon={{ source: icon ? Icon[icon as keyof typeof Icon] : Icon.Folder, tintColor: Color.Orange }}
              onAction={() => handleRunSyncFolders(id as string)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {syncFolders && syncFolders.length > 0 ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Submenu title="Massive Sync" icon={`bulk.svg`}>
            {syncFoldersWithoutDelete && syncFoldersWithoutDelete.length > 0 && (
              <MenuBarExtra.Item
                title="Sync All Folders without Delete"
                icon="folders-green.svg"
                onAction={handleSyncAllFoldersWithoutDelete}
              />
            )}
            {syncFoldersWithDelete && syncFoldersWithDelete.length > 0 && (
              <MenuBarExtra.Item
                title="Sync All Folders with Delete"
                icon="folders-orange.svg"
                onAction={handleSyncAllFoldersWithDelete}
              />
            )}
            <MenuBarExtra.Section>
              <MenuBarExtra.Item title="Sync All" icon="folders-red.svg" onAction={handleSyncAllFolders} />
            </MenuBarExtra.Section>
          </MenuBarExtra.Submenu>
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Item
          title="Create Sync Folders"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "create-sync-folders", type: LaunchType.UserInitiated })}
        />
      )}
    </MenuBarExtra>
  );
}
