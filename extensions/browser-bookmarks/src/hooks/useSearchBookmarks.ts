import { readdir, readFile } from "fs/promises";
import { homedir } from "os";

import { useCachedPromise } from "@raycast/utils";

import {
  getSearchBookmarks,
  getSearchFolders,
  getSearchGroupFolders,
  getSearchGroupTabs,
  getSearchPins,
  SEARCH_PINS_FOLDER,
  type SearchBookmarkNode,
  type SearchPinsFile,
  type SearchSession,
} from "../utils/searchBookmarks";
import { BROWSERS_BUNDLE_ID, getBrowserDataPath } from "./useAvailableBrowsers";

// Search keeps its data in a folder named after the app rather than after its
// bundle id, so the path is given here in full.
const SEARCH_PATH = getBrowserDataPath(BROWSERS_BUNDLE_ID.search, `${homedir()}/Library/Application Support/Search`);
const BOOKMARKS_PATH = `${SEARCH_PATH}/bookmarks.json`;
const PINS_PATH = `${SEARCH_PATH}/pins.json`;

// Any of these files is missing until there is something to put in it, and one
// without the others is an ordinary state rather than an error.
async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT" || error instanceof SyntaxError) {
      return undefined;
    }

    throw error;
  }
}

// One session file per space: session.json for the first, session-<id>.json
// for the others.
async function readSessions(): Promise<SearchSession[]> {
  let names: string[];

  try {
    names = await readdir(SEARCH_PATH);
  } catch {
    return [];
  }

  const files = names.filter((name) => name === "session.json" || /^session-.+\.json$/.test(name));
  const sessions = await Promise.all(files.map((name) => readJson<SearchSession>(`${SEARCH_PATH}/${name}`)));

  return sessions.filter((session): session is SearchSession => session !== undefined);
}

export default function useSearchBookmarks(enabled: boolean) {
  const { data, isLoading, mutate, error } = useCachedPromise(
    async (enabled: boolean) => {
      if (!enabled) {
        return;
      }

      const [bookmarks, pins, sessions] = await Promise.all([
        readJson<SearchBookmarkNode[]>(BOOKMARKS_PATH),
        readJson<SearchPinsFile>(PINS_PATH),
        readSessions(),
      ]);

      return { bookmarks: bookmarks ?? [], pins: pins ?? {}, sessions };
    },
    [enabled],
  );

  const pins = data ? getSearchPins(data.pins) : [];
  const bookmarks = data ? [...getSearchBookmarks(data.bookmarks), ...pins, ...getSearchGroupTabs(data.sessions)] : [];
  const folders = data ? [...getSearchFolders(data.bookmarks), ...getSearchGroupFolders(data.sessions)] : [];

  if (pins.length > 0) {
    folders.push(SEARCH_PINS_FOLDER);
  }

  return {
    bookmarks: bookmarks.map((bookmark) => {
      return { ...bookmark, browser: BROWSERS_BUNDLE_ID.search };
    }),
    folders: folders.map((folder) => {
      return { ...folder, icon: "search.png", browser: BROWSERS_BUNDLE_ID.search };
    }),
    isLoading,
    mutate,
    error,
  };
}
