import { LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { SyncFolders, SyncFoldersFormValues } from "../types";
import { createMD5HashFromStrings, executeRsync } from "../utils";

const SYNC_FOLDER_STORAGE_KEY = "my-sync-folders";

export function useSyncFolders() {
  const { value, setValue, isLoading } = useLocalStorage<SyncFolders[]>(SYNC_FOLDER_STORAGE_KEY, []);

  const mutate = async () => {
    const item = await LocalStorage.getItem<string>(SYNC_FOLDER_STORAGE_KEY);
    const parsed = JSON.parse(item ?? "[]");
    setValue(parsed as SyncFolders[]);
  };

  /**
   * Adds a new sync folder configuration to the current list of sync folders.
   *
   * @param {SyncFoldersFormValues} newSyncFolderFormValue - The form values containing the details of the new sync folder.
   * @param {string} newSyncFolderFormValue.icon - The icon for the sync folder.
   * @param {string} newSyncFolderFormValue.name - The name of the sync folder.
   * @param {string[]} newSyncFolderFormValue.source_folder - The source folder paths.
   * @param {string[]} newSyncFolderFormValue.dest_folder - The destination folder paths.
   * @param {boolean} newSyncFolderFormValue.delete_dest - Flag indicating whether to delete the destination folder.
   */
  function setSyncFolders(newSyncFolderFormValue: SyncFoldersFormValues) {
    const { name, icon, source_folder, dest_folder, delete_dest } = newSyncFolderFormValue;

    const id = createMD5HashFromStrings(
      icon,
      name,
      source_folder[0],
      dest_folder[0],
      delete_dest ? "delete_dest" : "no_delete_dest",
    );

    const newSyncFolder: SyncFolders = {
      id,
      icon,
      name,
      source_folder: source_folder[0],
      dest_folder: dest_folder[0],
      delete_dest,
    };

    setValue([...(value ?? []), newSyncFolder]);
  }

  /**
   * Updates the `last_sync` property of a sync folder identified by the given `id` to the current date and time.
   *
   * @param {string} [id] - The identifier of the sync folder to update. If not provided or if the sync folder is not found, the function will return without making any changes.
   */
  function updateLastSync(id?: string) {
    const syncFolderIndex = value?.findIndex((syncFolder) => syncFolder.id === id);

    if (syncFolderIndex !== undefined && syncFolderIndex >= 0 && value) {
      const newSyncFolder = { ...value[syncFolderIndex], last_sync: new Date() };

      value[syncFolderIndex] = newSyncFolder;
      setValue(value);
    }
  }

  /**
   * Updates a sync folders entry in the state with new values.
   *
   * @param id - The unique identifier of the sync folder to update.
   * @param newSyncFolderFormValue - The new values for the sync folder.
   * @param newSyncFolderFormValue.icon - The new icon for the sync folder.
   * @param newSyncFolderFormValue.name - The new name of the sync folder.
   * @param newSyncFolderFormValue.source_folder - The new source folder path.
   * @param newSyncFolderFormValue.dest_folder - The new destination folder path.
   * @param newSyncFolderFormValue.delete_dest - Flag indicating whether to delete the destination folder.
   * @param newSyncFolderFormValue.last_sync - The last synchronization timestamp.
   */
  function updateSyncFolders(id: string, newSyncFolderFormValue: SyncFoldersFormValues) {
    const { name, icon, source_folder, dest_folder, delete_dest, last_sync } = newSyncFolderFormValue;

    const syncFolderIndex = value?.findIndex((syncFolder) => syncFolder.id === id);

    if (syncFolderIndex !== undefined && syncFolderIndex >= 0 && value) {
      const newId = createMD5HashFromStrings(
        icon,
        name,
        source_folder[0],
        dest_folder[0],
        delete_dest ? "delete_dest" : "no_delete_dest",
      );

      const newSyncFolder: SyncFolders = {
        id: newId,
        icon,
        name,
        source_folder: source_folder[0],
        dest_folder: dest_folder[0],
        delete_dest,
        last_sync,
      };

      value[syncFolderIndex] = newSyncFolder;

      const newValue = [...value];

      setValue(newValue);
    }
  }

  function deleteSyncFolders(id?: string) {
    if (!id) {
      return;
    }

    if (value) {
      setValue(value.filter((syncFolder) => syncFolder.id !== id));
    }
  }

  /**
   * Runs the synchronization process for the specified folder.
   *
   * @param {SyncFolders | string} syncFolder - The folder to sync, either as a SyncFolders object or a string ID.
   * @returns {Promise<void>} A promise that resolves when the synchronization process is complete.
   *
   * This function performs the following steps:
   * 1. Displays a toast notification indicating that the synchronization process has started.
   * 2. If the `syncFolder` parameter is a string, it attempts to find the corresponding SyncFolders object by ID.
   * 3. If the SyncFolders object is not found, it updates the toast notification to indicate an error and logs the error to the console.
   * 4. Executes the rsync command to synchronize the folders.
   * 5. If an error occurs during the execution of the rsync command, it updates the toast notification to indicate an error and logs the error to the console.
   * 6. If the rsync command produces any standard error output, it updates the toast notification to indicate an error and logs the error to the console.
   * 7. If the rsync command completes successfully, it updates the toast notification to indicate success and logs the standard output to the console.
   * 8. Updates the last synchronization time for the specified folder.
   */
  async function runSyncFolders(syncFolder: SyncFolders | string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Syncing folders",
      message: "Syncing folders...",
    });

    if (typeof syncFolder === "string") {
      const syncFolderById = value?.find(({ id }) => id === syncFolder);

      if (!syncFolderById) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = "Sync folder not found";

        console.error("Sync folder not found");
        return;
      }
      syncFolder = syncFolderById;
    }

    executeRsync(syncFolder, (error, stdout, stderr) => {
      if (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = `An error occurred during the execution of the command ${error}`;

        console.error(`An error occurred during the execution of the command: ${error}`);
        return;
      }
      if (stderr) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = stderr;

        console.error(stderr);
        return;
      }
      toast.style = Toast.Style.Success;
      toast.title = "Folders synced";
    });

    updateLastSync(syncFolder.id);

    await showHUD("Folders synced 🙌");
  }

  return {
    syncFolders: value,
    setSyncFolders,
    deleteSyncFolders,
    runSyncFolders,
    updateSyncFolders,
    updateLastSync,
    isLoading,
    mutate,
  } as const;
}
