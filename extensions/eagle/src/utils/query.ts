import { usePromise } from "@raycast/utils";
import fileUrl from "file-url";
import {
  getItemThumbnail,
  getApplicationInfo,
  getItems,
  getFolderList,
  getTrashItems,
  getLibraryHistory,
  getCurrentLibrary,
} from "./api";
import { Folder } from "../@types/eagle";

/**
 * It fetches the thumbnail of an item from the server and returns the URL of the
 * image
 * @param {string} id - The id of the item you want to get the thumbnail for.
 * @returns A function that returns a promise that resolves to a string.
 */
export function useThumbnail(id: string) {
  return usePromise(
    async (id: string) => {
      const res = await getItemThumbnail(id);
      const imagePath = decodeURIComponent(res.data.data);
      return fileUrl(imagePath);
    },
    [id],
  );
}

export function useApplicationInfo() {
  return usePromise(async () => {
    const res = await getApplicationInfo();
    return res.data.data;
  });
}

export function useItemList(search: string) {
  return usePromise(
    async (search: string) => {
      const res = await getItems({ keyword: search });
      if (res.data.status !== "success") return [];
      return res.data.data;
    },
    [search],
  );
}

export function useFolderItemList(folders?: string) {
  const shouldFetch = folders !== undefined;

  return usePromise(
    async (folders: string) => {
      const res = await getItems({ folders });
      if (res.data.status !== "success") return [];
      return res.data.data;
    },
    [folders || ""],
    {
      execute: shouldFetch,
    },
  );
}

export function useRootItemList() {
  return usePromise(async () => {
    const res = await getItems({ folders: "" });
    if (res.data.status !== "success") return [];
    return res.data.data;
  });
}

export function useFolderList() {
  return usePromise(async () => {
    const res = await getFolderList();
    if (res.data.status !== "success") return [];
    return res.data.data;
  });
}

// Helper function to flatten folder tree into a map
function flattenFolders(folders: Folder[], map: Map<string, string> = new Map()): Map<string, string> {
  for (const folder of folders) {
    map.set(folder.id, folder.name);
    if (folder.children && folder.children.length > 0) {
      flattenFolders(folder.children, map);
    }
  }
  return map;
}

export function useFolderMap() {
  return usePromise(async () => {
    const res = await getFolderList();
    if (res.data.status !== "success") return new Map();
    return flattenFolders(res.data.data);
  });
}

export function useTrashItemList() {
  return usePromise(async () => {
    return await getTrashItems();
  });
}

export function useLibraryHistory() {
  return usePromise(async () => {
    return await getLibraryHistory();
  });
}

export function useCurrentLibrary() {
  return usePromise(async () => {
    return await getCurrentLibrary();
  });
}
