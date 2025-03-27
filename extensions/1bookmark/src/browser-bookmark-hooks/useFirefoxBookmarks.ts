import { existsSync, readdirSync, readFile } from "fs";
import { homedir } from "os";
import path from "path";
import { promisify } from "util";

import { environment } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import ini from "ini";
import { useMemo } from "react";
import initSqlJs, { Database } from "sql.js";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";

const read = promisify(readFile);

const FIREFOX_FOLDER = `${homedir()}/Library/Application Support/Firefox`;

const folderNames: Record<string, string> = {
  menu: "Bookmark Menu",
  mobile: "Mobile Bookmarks",
  tags: "Tags",
  toolbar: "Toolbar",
  unfiled: "Other Bookmarks",
};

async function getFirefoxProfiles() {
  if (!existsSync(`${FIREFOX_FOLDER}/profiles.ini`)) {
    return { profiles: [], defaultProfile: "" };
  }

  const file = await read(`${FIREFOX_FOLDER}/profiles.ini`, "utf-8");
  const iniFile = ini.parse(file);

  const profiles = Object.keys(iniFile)
    // Only keep profiles that have bookmarks
    .filter((key) => {
      if (key.startsWith("Profile")) {
        const path = iniFile[key].Path;
        const profileDirectory = readdirSync(`${FIREFOX_FOLDER}/${path}`);
        return profileDirectory.includes("places.sqlite");
      }
    })
    .map((key) => ({ name: iniFile[key].Name, path: iniFile[key].Path }));

  const installKey = Object.keys(iniFile).find((key) => key.startsWith("Install"));

  const defaultProfile: string = installKey ? iniFile[installKey]?.Default : profiles[0].path;
  profiles.sort((a, b) => a.name?.localeCompare(b.name));

  return { profiles, defaultProfile };
}

type Folder = {
  id: number;
  parentId: number;
  title: string;
  guid: string;
};

function getFirefoxFolders(db: Database) {
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

function getFirefoxBookmarks(db: Database) {
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

export default function useFirefoxBookmarks(enabled: boolean) {
  const [currentProfile, setCurrentProfile] = useCachedState(`firefox-profile`, "");

  const { data: profiles } = useCachedPromise(
    async (enabled) => {
      if (!enabled) {
        return;
      }

      const { profiles, defaultProfile } = await getFirefoxProfiles();

      // Initially set the current profile when nothing is set in the cache yet
      if (currentProfile === "") {
        setCurrentProfile(defaultProfile);
      }

      return profiles;
    },
    [enabled],
  );

  const { data, isLoading, mutate } = useCachedPromise(
    async (profile, enabled) => {
      if (!profile || !enabled || !existsSync(`${FIREFOX_FOLDER}/${profile}/places.sqlite`)) {
        return;
      }

      const buffer = new Uint8Array(await read(`${FIREFOX_FOLDER}/${profile}/places.sqlite`));
      const wasmBinary = await read(path.join(environment.assetsPath, "sql-wasm.wasm"));
      const SQL = await initSqlJs({ wasmBinary });
      const db = new SQL.Database(buffer);

      const folders = getFirefoxFolders(db);
      const bookmarks = getFirefoxBookmarks(db);

      return { folders, bookmarks };
    },
    [currentProfile, enabled],
  );

  const folders = useMemo(
    () =>
      data?.folders?.map((folder) => {
        const hierarchy = [folder.parentId === 1 ? folderNames[folder.title] || folder.title : folder.title];

        while (folder.parentId !== 1) {
          const parent = data.folders?.find((f) => f.id === folder.parentId);

          if (parent) {
            hierarchy.push(parent.parentId === 1 ? folderNames[parent.title] || parent.title : parent.title);
            folder.parentId = parent.parentId;
          } else {
            break;
          }
        }

        return {
          ...folder,
          id: `${folder.id}`,
          title: hierarchy.reverse().join("/"),
          icon: "firefox.png",
          browser: BROWSERS_BUNDLE_ID.firefox,
        };
      }) || [],
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
          browser: BROWSERS_BUNDLE_ID.firefox,
        };
      }) || [],
    [data, folders],
  );

  return {
    profiles: profiles || [],
    currentProfile,
    setCurrentProfile,
    bookmarks,
    folders,
    isLoading,
    mutate,
  };
}
