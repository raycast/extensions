import axios from "axios";
import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { Application, EagleAPIResponse, Folder, Item } from "../@types/eagle";
import { EagleClient, EagleItem, EagleLibrary, EaglePage } from "../@types/eagle-v2";

export const instance = axios.create({
  baseURL: "http://localhost:41595/api/",
});

type Order = "CREATEDATE" | "FILESIZE" | "NAME" | "RESOLUTION";

type OrderBy = `${"" | "-"}${Order}`;

export function getItems(params: {
  limit?: number;
  orderBy?: OrderBy;
  keyword?: string;
  ext?: string;
  tags?: string;
  folders?: string;
}) {
  return instance.get<EagleAPIResponse<Item[]>>("/item/list", {
    params,
  });
}

export function getItemThumbnail(id: string) {
  return instance.get<EagleAPIResponse<string>>("/item/thumbnail", {
    params: {
      id,
    },
  });
}

export function getApplicationInfo() {
  return instance.get<EagleAPIResponse<Application>>("/application/info");
}

export function getFolderList() {
  return instance.get<EagleAPIResponse<Folder[]>>("/folder/list");
}

export function moveToTrash(itemIds: string[]) {
  return instance.post<EagleAPIResponse<null>>("/item/moveToTrash", {
    itemIds,
  });
}

export async function getTrashItems(): Promise<Item[]> {
  try {
    // Get library path from API
    const libraryInfo = await instance.get<EagleAPIResponse<{ library: { path: string } }>>("/library/info");
    const libraryPath = libraryInfo.data.data.library.path;
    const imagesPath = join(libraryPath, "images");

    // Read all item folders
    const itemFolders = await readdir(imagesPath);
    const trashItems: Item[] = [];

    // Read metadata for each item
    for (const folder of itemFolders) {
      if (!folder.endsWith(".info")) continue;

      try {
        const metadataPath = join(imagesPath, folder, "metadata.json");
        const metadataContent = await readFile(metadataPath, "utf-8");
        const item = JSON.parse(metadataContent) as Item;

        // Only include deleted items
        if (item.isDeleted) {
          trashItems.push(item);
        }
      } catch {
        // Skip folders that don't have valid metadata
        continue;
      }
    }

    // Sort by deletion time (newest first)
    trashItems.sort((a, b) => {
      const aTime = (a as Item & { deletedTime?: number }).deletedTime || 0;
      const bTime = (b as Item & { deletedTime?: number }).deletedTime || 0;
      return bTime - aTime;
    });

    return trashItems;
  } catch (error) {
    console.error("Failed to get trash items:", error);
    return [];
  }
}

export async function getLibraryHistory() {
  const response = await instance.get<EagleAPIResponse<string[]>>("/library/history");
  return response.data.data.map((path) => ({
    path,
    name: basename(path, ".library"),
  }));
}

export function switchLibrary(libraryPath: string) {
  return instance.post<EagleAPIResponse<null>>("/library/switch", {
    libraryPath,
  });
}

export function getLibraryIcon(libraryPath: string) {
  const encodedPath = encodeURIComponent(libraryPath);
  return `http://localhost:41595/api/library/icon?libraryPath=${encodedPath}`;
}

export async function getCurrentLibrary() {
  const response = await instance.get<EagleAPIResponse<{ library: { path: string; name: string } }>>("/library/info");
  return response.data.data.library;
}

export function addItemFromURL(params: {
  url: string;
  name?: string;
  website?: string;
  tags?: string[];
  annotation?: string;
  modificationTime?: number;
  folderId?: string;
}) {
  return instance.post<EagleAPIResponse<null>>("/item/addFromURL", params);
}

export function addItemFromPath(params: {
  path: string;
  name?: string;
  website?: string;
  tags?: string[];
  annotation?: string;
  modificationTime?: number;
  folderId?: string;
}) {
  return instance.post<EagleAPIResponse<null>>("/item/addFromPath", params);
}

export function updateItem(params: { id: string; tags?: string[]; annotation?: string; url?: string; star?: number }) {
  return instance.post<EagleAPIResponse<null>>("/item/update", params);
}

export function createFolder(params: { folderName: string; parent?: string }) {
  return instance.post<
    EagleAPIResponse<{
      id: string;
      name: string;
      images: string[];
      folders: string[];
      modificationTime: number;
      imagesMappings: Record<string, unknown>;
      tags: string[];
      children: unknown[];
      isExpand: boolean;
    }>
  >("/folder/create", params);
}

export function renameFolder(params: { folderId: string; newName: string }) {
  return instance.post<
    EagleAPIResponse<{
      id: string;
      name: string;
      images: string[];
      folders: string[];
      modificationTime: number;
      imagesMappings: Record<string, unknown>;
      tags: string[];
      children: unknown[];
      isExpand: boolean;
      size: number;
      vstype: string;
      styles: Record<string, unknown>;
      isVisible: boolean;
      pinyin: string;
    }>
  >("/folder/rename", params);
}

export function updateFolder(params: {
  folderId: string;
  newName?: string;
  newDescription?: string;
  newColor?: "red" | "orange" | "green" | "yellow" | "aqua" | "blue" | "purple" | "pink";
}) {
  return instance.post<
    EagleAPIResponse<{
      id: string;
      name: string;
      description?: string;
      images: string[];
      folders: string[];
      modificationTime: number;
      imagesMappings: Record<string, unknown>;
      tags: string[];
      children: unknown[];
      isExpand: boolean;
      size: number;
      vstype: string;
      styles: Record<string, unknown>;
      isVisible: boolean;
      pinyin: string;
      iconColor?: string;
    }>
  >("/folder/update", params);
}

export function getRecentFolders() {
  return instance.get<EagleAPIResponse<Folder[]>>("/folder/listRecent");
}

export default instance;

// Keep the existing commands on V1. AI tools require Eagle 4.0 Build 21's V2 API.
async function v2Request<T>(endpoint: string, body?: unknown): Promise<T> {
  try {
    const response = await instance.request<{ status: string; data: T; message?: string }>({
      url: `v2/${endpoint}`,
      method: body === undefined ? "GET" : "POST",
      data: body,
      timeout: 30_000,
    });
    if (response.data.status !== "success") {
      throw new Error(response.data.message || "Eagle rejected the request.");
    }
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error("AI tools require Eagle 4.0 Build 21 or later. Update Eagle and keep it running.");
      }
      throw new Error("Cannot reach Eagle's V2 API. Keep Eagle 4.0 Build 21 or later running and try a read again.");
    }
    throw error;
  }
}

export const eagleV2: EagleClient = {
  library: () => v2Request<EagleLibrary>("library/info"),
  items: (filters) => v2Request<EaglePage<EagleItem>>("item/get", filters),
  query: (query, offset, limit) => v2Request<EaglePage<EagleItem>>("item/query", { query, offset, limit }),
  add: (item) => v2Request<{ id: string }>("item/add", item),
  update: (id, changes) => v2Request<EagleItem>("item/update", { id, ...changes }),
};
