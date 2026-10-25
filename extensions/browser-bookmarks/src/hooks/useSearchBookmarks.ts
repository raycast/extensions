import { homedir } from "os";

import { useCachedPromise, useCachedState } from "@raycast/utils";

import {
  getSearchBookmarks,
  getSearchFolders,
  getSearchGroupFolders,
  getSearchGroupTabs,
  getSearchPins,
  readSearchData,
  readSearchProfiles,
  SEARCH_PERSONAL_PROFILE,
  SEARCH_PINS_FOLDER,
} from "../utils/searchBookmarks";
import { BROWSERS_BUNDLE_ID, getBrowserDataPath } from "./useAvailableBrowsers";

// Search keeps its data in a folder named after the app rather than after its
// bundle id, so the path is given here in full.
const SEARCH_PATH = getBrowserDataPath(BROWSERS_BUNDLE_ID.search, `${homedir()}/Library/Application Support/Search`);

export default function useSearchBookmarks(enabled: boolean) {
  const [currentProfile, setCurrentProfile] = useCachedState("search-profile", "");
  const { data: profiles } = useCachedPromise(
    async (enabled: boolean) => {
      if (!enabled) {
        return;
      }

      // Initially set the current profile when nothing is set in the cache yet
      if (currentProfile === "") {
        setCurrentProfile(SEARCH_PERSONAL_PROFILE);
      }

      return readSearchProfiles(SEARCH_PATH);
    },
    [enabled],
  );

  const { data, isLoading, mutate, error } = useCachedPromise(
    async (profile: string, enabled: boolean) => {
      if (!enabled) {
        return;
      }

      return readSearchData(SEARCH_PATH, profile);
    },
    [currentProfile, enabled],
  );

  const pins = data ? getSearchPins(data.pins, data.keys) : [];
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
    profiles: profiles || [],
    currentProfile,
    setCurrentProfile,
  };
}
