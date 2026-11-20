import { open, showInFinder, showToast, Toast } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { BooxClient } from "../api/boox-client";
import { getDownloadDirectory } from "./preferences";
import { BooxNote, StorageEntry } from "../models/boox";
import { describeBooxError } from "./errors";
import { resolveDownloadPath } from "./paths";

export async function downloadStorageEntry(client: BooxClient, entry: StorageEntry): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Downloading ${entry.name}` });
  try {
    const directory = getDownloadDirectory();
    await mkdir(directory, { recursive: true });
    const remotePath = entry.dir ? await client.packageStorage([entry]) : entry.path;
    const fileName = entry.dir ? `${entry.name}.zip` : entry.name;
    const destination = resolveDownloadPath(directory, fileName);
    const localPath = await client.downloadFile(remotePath, destination);
    toast.style = Toast.Style.Success;
    toast.title = "Downloaded from BOOX";
    toast.message = path.basename(localPath);
    toast.primaryAction = { title: "Open", onAction: () => open(localPath) };
    toast.secondaryAction = { title: "Show in Finder", onAction: () => showInFinder(localPath) };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download Failed";
    toast.message = describeBooxError(error);
  }
}

export async function downloadNote(client: BooxClient, note: BooxNote): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Exporting ${note.title}` });
  try {
    const directory = getDownloadDirectory();
    await mkdir(directory, { recursive: true });
    const localPath = await client.downloadNote(note, resolveDownloadPath(directory, `${note.title}.pdf`));
    toast.style = Toast.Style.Success;
    toast.title = "Note Exported";
    toast.message = path.basename(localPath);
    toast.primaryAction = { title: "Open", onAction: () => open(localPath) };
    toast.secondaryAction = { title: "Show in Finder", onAction: () => showInFinder(localPath) };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Export Failed";
    toast.message = describeBooxError(error);
  }
}

export async function backupNotes(client: BooxClient): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating BOOX Notes Backup" });
  try {
    const directory = getDownloadDirectory();
    await mkdir(directory, { recursive: true });
    const remotePath = await client.createNoteBackup();
    const remoteName = path.basename(remotePath) || `BOOX Notes ${new Date().toISOString().slice(0, 10)}.zip`;
    const localPath = await client.downloadNoteBackup(remotePath, resolveDownloadPath(directory, remoteName));
    toast.style = Toast.Style.Success;
    toast.title = "Notes Backup Downloaded";
    toast.message = path.basename(localPath);
    toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(localPath) };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Notes Backup Failed";
    toast.message = describeBooxError(error);
  }
}
