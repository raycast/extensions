import fs from "fs";
import { readFile } from "fs";
import path from "path";
import { promisify } from "util";

import { environment } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import ini from "ini";
import { useMemo, useEffect } from "react";
import initSqlJs, { Database } from "sql.js";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";

const read = promisify(readFile);

const ZEN_FOLDER = path.join(process.env.HOME || "", "Library", "Application Support", "zen");

const folderNames: Record<string, string> = {
  menu: "Bookmark Menu",
  mobile: "Mobile Bookmarks",
  tags: "Tags",
  toolbar: "Toolbar",
  unfiled: "Other Bookmarks",
};

async function getZenProfiles() {
  if (!fs.existsSync(`${ZEN_FOLDER}/profiles.ini`)) {
    return { profiles: [], defaultProfile: "" };
  }

  const file = await read(`${ZEN_FOLDER}/profiles.ini`, "utf-8");
  const iniFile = ini.parse(file);

  const profiles = Object.keys(iniFile)
    .filter((key) => {
      if (key.startsWith("Profile")) {
        const profilePath = iniFile[key].Path;
        const fullProfilePath = path.join(ZEN_FOLDER, profilePath);
        return fs.existsSync(path.join(fullProfilePath, "places.sqlite"));
      }
      return false;
    })
    .map((key) => ({
      name: iniFile[key].Name || iniFile[key].Path,
      path: iniFile[key].Path,
      isDefault: iniFile[key].Default === "1" || iniFile[key].Path.includes(".Default (alpha)"),
    }));

  let defaultProfile = profiles.find((p) => p.isDefault)?.path;
  if (!defaultProfile && profiles.length > 0) {
    defaultProfile = profiles[0].path;
  }

  profiles.sort((a, b) => {
    if (a.path === defaultProfile) return -1;
    if (b.path === defaultProfile) return 1;
    return a.name.localeCompare(b.name);
  });

  return { profiles, defaultProfile };
}

type Folder = {
  id: number;
  parentId: number;
  title: string;
  guid: string;
};

function getZenFolders(db: Database) {
  const folders = [];
  const statement = db.prepare(
    `
      SELECT moz_bookmarks.id AS id,
        moz_bookmarks.parent AS parentId,
        moz_bookmarks.title AS title,
        moz_bookmarks.guid AS guid
      FROM moz_bookmarks
      WHERE moz_bookmarks.type = 2
        AND moz_bookmarks.title IS NOT NULL
        AND moz_bookmarks.title <> ''
        AND moz_bookmarks.fk IS NULL;
    `,
  );

  while (statement.step()) {
    const row = statement.getAsObject() as Folder;
    folders.push(row);
  }

  statement.free();
  return folders;
}

type Bookmark = {
  id: number;
  parentId: number;
  title: string;
  urlString: string;
};

function getZenBookmarks(db: Database) {
  const bookmarks = [];
  const statement = db.prepare(
    `
      SELECT moz_places.id AS id,
        moz_bookmarks.parent AS parentId,
        moz_bookmarks.title AS title,
        moz_places.url AS urlString
      FROM moz_bookmarks LEFT JOIN moz_places ON moz_bookmarks.fk = moz_places.id
      WHERE moz_bookmarks.type = 1
        AND moz_bookmarks.title IS NOT NULL
        AND moz_places.url IS NOT NULL;
    `,
  );

  while (statement.step()) {
    const row = statement.getAsObject() as Bookmark;
    bookmarks.push(row);
  }

  statement.free();
  return bookmarks;
}

function processFolderHierarchy(folders: Folder[]): Folder[] {
  const processedFolders = [...folders];

  // Find the toolbar folder ID
  const toolbarFolder = processedFolders.find((f) => f.parentId === 1 && f.title.toLowerCase() === "toolbar");
  const toolbarId = toolbarFolder?.id;

  return processedFolders.map((folder) => {
    // For root-level folders, use friendly names
    if (folder.parentId === 1) {
      const friendlyName = folderNames[folder.title.toLowerCase()];
      return {
        ...folder,
        title: friendlyName || folder.title,
      };
    }

    // Build hierarchy for non-root folders
    const hierarchy = [folder.title];
    let currentFolder = folder;

    while (currentFolder.parentId !== 1) {
      const parent = processedFolders.find((f) => f.id === currentFolder.parentId);
      if (!parent) break;

      // If we hit the toolbar folder, mark it but don't add to hierarchy
      if (parent.id === toolbarId) {
        break;
      }

      hierarchy.unshift(parent.title);
      currentFolder = parent;
    }

    // If the folder is directly under toolbar, return just its title
    if (folder.parentId === toolbarId) {
      return {
        ...folder,
        title: folder.title,
      };
    }

    // For nested folders under toolbar or other paths, join hierarchy
    return {
      ...folder,
      title: hierarchy.join("/"),
    };
  });
}

export default function useZenBookmarks(enabled: boolean) {
  const [currentProfile, setCurrentProfile] = useCachedState(`zen-profile`, "");

  const { data: profileData, isLoading: isLoadingProfiles } = useCachedPromise(
    async (enabled) => {
      if (!enabled) return null;
      return getZenProfiles();
    },
    [enabled],
  );

  useEffect(() => {
    if (profileData && currentProfile === "" && profileData.defaultProfile) {
      setCurrentProfile(profileData.defaultProfile);
    }
  }, [profileData, currentProfile, setCurrentProfile]);

  const {
    data,
    isLoading: isLoadingBookmarks,
    mutate,
  } = useCachedPromise(
    async (profile, enabled) => {
      if (!profile || !enabled) return null;

      const dbPath = path.join(ZEN_FOLDER, profile, "places.sqlite");

      if (!fs.existsSync(dbPath)) {
        console.log("Database not found at:", dbPath);
        return null;
      }

      const buffer = new Uint8Array(await read(dbPath));
      const wasmBinary = await read(path.join(environment.assetsPath, "sql-wasm.wasm"));
      const SQL = await initSqlJs({ wasmBinary });
      const db = new SQL.Database(buffer);

      const rawFolders = getZenFolders(db);
      const folders = processFolderHierarchy(rawFolders);
      const bookmarks = getZenBookmarks(db);

      return { folders, bookmarks };
    },
    [currentProfile, enabled],
  );

  const folders = useMemo(
    () =>
      data?.folders?.map((folder) => ({
        ...folder,
        id: `${folder.id}`,
        icon: "zen.png",
        browser: BROWSERS_BUNDLE_ID.zen,
      })) || [],
    [data],
  );

  const bookmarks = useMemo(
    () =>
      data?.bookmarks?.map((bookmark) => {
        const folder = folders.find((folder) => folder.id === `${bookmark.parentId}`);
        return {
          id: `${bookmark.id}`,
          title: bookmark.title,
          url: bookmark.urlString,
          folder: folder ? folder.title : "",
          browser: BROWSERS_BUNDLE_ID.zen,
        };
      }) || [],
    [data, folders],
  );

  const isLoading = isLoadingProfiles || isLoadingBookmarks;

  return {
    profiles: profileData?.profiles || [],
    currentProfile,
    setCurrentProfile,
    bookmarks,
    folders,
    isLoading,
    mutate,
  };
}
