import { exec } from "child_process";
import { SyncFolders } from "../types";

type Callback = (error: Error | null, stdout: string, stderr: string) => void;

/**
 * Executes the rsync command to synchronize folders.
 *
 * @param sync_folders - An object containing the source and destination folders, and a flag to indicate if files should be deleted in the destination folder.
 * @param sync_folders.source_folder - The source folder to sync from.
 * @param sync_folders.dest_folder - The destination folder to sync to.
 * @param sync_folders.delete_dest - A boolean flag indicating whether to delete files in the destination folder that are not present in the source folder.
 * @param callback - An optional callback function to be executed after the rsync command completes.
 *
 * @returns A promise that resolves when the rsync command completes.
 */
export function executeRsync(sync_folders: SyncFolders, callback?: Callback) {
  const { source_folder, dest_folder, delete_dest } = sync_folders;

  const deleteFlag = delete_dest ? "--delete" : "";
  const command = `rsync -aE ${deleteFlag} "${source_folder}/" "${dest_folder}"`;

  exec(command, callback);
}
