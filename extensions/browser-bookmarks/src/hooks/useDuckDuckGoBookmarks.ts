import { access } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

import { executeSQL, useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";

const DATABASE_PATH = join(
  homedir(),
  "Library",
  "Containers",
  "com.duckduckgo.macos.browser",
  "Data",
  "Library",
  "Application Support",
  "Bookmarks.sqlite",
);

const ROOT_FOLDER_UUIDS = ["bookmarks_root", "favorites_root", "mobile_favorites_root", "desktop_favorites_root"];

type Entity = {
  id: number;
  parentId: number | null;
  uuid: string;
  title: string | null;
  url: string | null;
  isFolder: number;
};

async function getDuckDuckGoEntities() {
  try {
    await access(DATABASE_PATH);
  } catch (error) {
    // Rethrow anything other than a missing file so a macOS permission denial reaches the permission screen.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  return executeSQL<Entity>(
    DATABASE_PATH,
    `
      SELECT Z_PK AS id,
        ZPARENT AS parentId,
        ZUUID AS uuid,
        ZTITLE AS title,
        ZURL AS url,
        ZISFOLDER AS isFolder
      FROM ZBOOKMARKENTITY
      WHERE IFNULL(ZISPENDINGDELETION, 0) = 0
        AND IFNULL(ZISSTUB, 0) = 0;
    `,
  );
}

export default function useDuckDuckGoBookmarks(enabled: boolean) {
  const { data, isLoading, mutate, error } = useCachedPromise(
    async (enabled) => (enabled ? getDuckDuckGoEntities() : []),
    [enabled],
  );

  const { folders, bookmarks } = useMemo(() => {
    const entities = data ?? [];
    const foldersById = new Map(entities.filter((entity) => entity.isFolder).map((entity) => [entity.id, entity]));
    const hierarchyById = new Map<number, string>();

    function getHierarchy(folder: Entity) {
      const hierarchy: string[] = [];
      const visited = new Set<number>();
      let current: Entity | undefined = folder;

      while (current && !ROOT_FOLDER_UUIDS.includes(current.uuid) && !visited.has(current.id)) {
        visited.add(current.id);
        hierarchy.unshift(current.title ?? "");
        current = current.parentId !== null ? foldersById.get(current.parentId) : undefined;
      }

      return hierarchy.join("/");
    }

    const folders = [...foldersById.values()]
      .filter((folder) => !ROOT_FOLDER_UUIDS.includes(folder.uuid))
      .map((folder) => {
        const title = getHierarchy(folder);
        hierarchyById.set(folder.id, title);

        return { id: folder.uuid, title, icon: "duckduckgo.png", browser: BROWSERS_BUNDLE_ID.duckDuckGo };
      });

    const bookmarks = entities
      .filter((entity) => !entity.isFolder && entity.url)
      .map((entity) => ({
        id: entity.uuid,
        title: entity.title ?? entity.url ?? "",
        url: entity.url ?? "",
        folder: (entity.parentId !== null && hierarchyById.get(entity.parentId)) || "",
        browser: BROWSERS_BUNDLE_ID.duckDuckGo,
      }));

    return { folders, bookmarks };
  }, [data]);

  return {
    bookmarks,
    folders,
    isLoading,
    mutate,
    error,
  };
}
