import axios from "axios";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { Application, EagleAPIResponse, Folder, Item } from "../@types/eagle";

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

export default instance;
