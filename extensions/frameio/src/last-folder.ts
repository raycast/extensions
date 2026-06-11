import { LocalStorage } from "@raycast/api";
import { buildFolderBrowserUrl, tryGetFolder, tryGetVersionStack } from "./api/frameio";
import { debug } from "./debug";

export interface LastFolder {
  accountId: string;
  folderId: string;
  title: string;
  viewUrl?: string;
  thumbnailUrl?: string;
  updatedAt?: string;
}

export const STORAGE_KEY_LAST_FOLDER = "lastFolder";

export async function saveLastFolder(folder: LastFolder): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_LAST_FOLDER, JSON.stringify(folder));
  debug.info(`Saved recent folder: "${folder.title}"`);
}

export async function getLastFolder(): Promise<LastFolder | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY_LAST_FOLDER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastFolder;
  } catch {
    return null;
  }
}

/** Résout le dossier contenant un asset (parent = folder ou version stack) */
export async function resolveContainingFolder(
  accountId: string,
  parentId: string | null | undefined
): Promise<{ folderId: string; title: string; viewUrl?: string } | null> {
  if (!parentId) return null;

  const directFolder = await tryGetFolder(accountId, parentId);
  if (directFolder) {
    return {
      folderId: directFolder.id,
      title: directFolder.name,
      viewUrl: buildFolderBrowserUrl(directFolder),
    };
  }

  const stack = await tryGetVersionStack(accountId, parentId);
  if (!stack?.parent_id) return null;

  const parentFolder = await tryGetFolder(accountId, stack.parent_id);
  if (!parentFolder) return null;

  return {
    folderId: parentFolder.id,
    title: parentFolder.name,
    viewUrl: buildFolderBrowserUrl(parentFolder),
  };
}

/** Charge les métadonnées complètes du dernier dossier pour l'affichage Detail */
export async function loadLastFolderDetails(last: LastFolder): Promise<{
  title: string;
  viewUrl?: string;
  thumbnailUrl?: string;
  updatedAt?: string;
}> {
  const folder = await tryGetFolder(last.accountId, last.folderId);
  const viewUrl = (folder ? buildFolderBrowserUrl(folder) : undefined) ?? last.viewUrl;
  return {
    title: folder?.name ?? last.title,
    viewUrl,
    thumbnailUrl: last.thumbnailUrl,
    updatedAt: folder?.updated_at ?? last.updatedAt,
  };
}

export async function saveLastFolderFromParent(accountId: string, parentId: string | null | undefined): Promise<void> {
  const resolved = await resolveContainingFolder(accountId, parentId);
  if (!resolved) return;
  await saveLastFolder({
    accountId,
    folderId: resolved.folderId,
    title: resolved.title,
    viewUrl: resolved.viewUrl,
  });
}

/** URL Frame.io web du dossier parent d'un fichier */
export async function getParentFolderViewUrl(
  accountId: string,
  fileParentId: string | null | undefined,
  currentFolderId: string,
  currentFolderViewUrl?: string | null
): Promise<string | null> {
  if (!fileParentId || fileParentId === currentFolderId) {
    return currentFolderViewUrl ?? null;
  }
  const resolved = await resolveContainingFolder(accountId, fileParentId);
  return resolved?.viewUrl ?? null;
}
