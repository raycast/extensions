import { usePromise } from "@raycast/utils";
import { listFolders, listLanguages, listStorages, listWorkspaces } from "./snipper-helper";
import type { Folder, Language, Snippet, Workspace } from "./types";

export interface LibraryMeta {
  languages: Map<string, Language>;
  workspaces: Workspace[];
  folders: Folder[];
  workspaceNameById: Map<string, string>;
  /** folderId -> workspaceId (via storage) */
  folderWorkspace: Map<string, string>;
}

/**
 * Load languages, workspaces, and the folder→workspace mapping.
 * Uses `usePromise` (not `useCachedPromise`) on purpose: the result holds `Map`s, which are
 * not JSON-serializable — a disk cache would rehydrate them as plain objects without `.get`.
 */
export function useLibraryMeta() {
  return usePromise(async (): Promise<LibraryMeta> => {
    const [languages, workspaces, folders, storages] = await Promise.all([
      listLanguages(),
      listWorkspaces(),
      listFolders(),
      listStorages(),
    ]);
    const languageMap = new Map(languages.map((language) => [language.id, language]));
    const workspaceNameById = new Map(workspaces.map((workspace) => [workspace.id, workspace.name]));
    const storageWorkspace = new Map(storages.map((storage) => [storage.id, storage.workspaceId]));
    const folderWorkspace = new Map<string, string>();
    for (const folder of folders) {
      const workspaceId = storageWorkspace.get(folder.storageId);
      if (workspaceId) folderWorkspace.set(folder.id, workspaceId);
    }
    return { languages: languageMap, workspaces, folders, workspaceNameById, folderWorkspace };
  }, []);
}

/** Resolve a snippet's workspace id (direct column, else via its folder's storage). */
export function workspaceOf(snippet: Snippet, meta?: LibraryMeta): string | undefined {
  if (snippet.workspaceId) return snippet.workspaceId;
  if (snippet.folderId && meta) return meta.folderWorkspace.get(snippet.folderId);
  return undefined;
}
