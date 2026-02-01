import fs from "fs";
import path from "path";
import { runAppleScript } from "run-applescript";
import {
  DEFAULT_COMET_PROFILE_ID,
  defaultCometProfilePath,
  defaultCometStatePath,
} from "../constants";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../interfaces";
import { HistoryEntry } from "../interfaces";

type CometFile = "History" | "Bookmarks";
const userLibraryDirectoryPath = () => {
  if (!process.env["HOME"]) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env["HOME"], "Library");
};

const getCometFilePath = (fileName: CometFile, profile?: string) => {
  const { profilePath } = getPreferenceValues<Preferences>();
  let resolvedProfilePath;
  if (profilePath) {
    resolvedProfilePath = path.join(profilePath, fileName);
  } else {
    resolvedProfilePath = path.join(
      userLibraryDirectoryPath(),
      ...defaultCometProfilePath,
      profile ?? DEFAULT_COMET_PROFILE_ID,
      fileName,
    );
  }

  if (!fs.existsSync(resolvedProfilePath)) {
    throw new Error(
      `The profile path ${resolvedProfilePath} does not exist. Please check your Comet profile location by visiting comet://version -> Profile Path. Then update it in Extension Settings -> Profile Path.`,
    );
  }

  return resolvedProfilePath;
};

export const getHistoryDbPath = (profile?: string) =>
  getCometFilePath("History", profile);

export const getLocalStatePath = () =>
  path.join(userLibraryDirectoryPath(), ...defaultCometStatePath);

export const getBookmarks = async (): Promise<HistoryEntry[]> => {
  try {
    const bookmarksScript = `
      set bookmarkList to ""
      tell application "Comet"
        try
          set allBookmarkFolders to bookmark folders
          repeat with currentFolder in allBookmarkFolders
            try
              set folderItems to bookmark items of currentFolder
              repeat with currentItem in folderItems
                try
                  set itemTitle to name of currentItem
                  set itemURL to URL of currentItem
                  if itemURL is not "" and itemURL does not start with "javascript:" then
                    set bookmarkList to bookmarkList & itemTitle & "~~~" & itemURL & "\\n"
                  end if
                on error itemError
                  log "Error processing bookmark item: " & itemError
                end try
              end repeat
              
              -- Process subfolders recursively
              set subFolders to bookmark folders of currentFolder
              repeat with subFolder in subFolders
                try
                  set subFolderItems to bookmark items of subFolder
                  repeat with subItem in subFolderItems
                    try
                      set subItemTitle to name of subItem
                      set subItemURL to URL of subItem
                      if subItemURL is not "" and subItemURL does not start with "javascript:" then
                        set bookmarkList to bookmarkList & subItemTitle & "~~~" & subItemURL & "\\n"
                      end if
                    on error subItemError
                      log "Error processing subfolder bookmark item: " & subItemError
                    end try
                  end repeat
                on error subFolderError
                  log "Error processing subfolder: " & subFolderError
                end try
              end repeat
            on error folderError
              log "Error processing bookmark folder: " & folderError
            end try
          end repeat
        on error mainError
          log "Error accessing Comet bookmarks: " & mainError
          set bookmarkList to ""
        end try
      end tell
      return bookmarkList
    `;

    const result = await runAppleScript(bookmarksScript);

    const bookmarks: HistoryEntry[] = [];

    if (result && result.trim() !== "") {
      const lines = result.trim().split("\n");

      for (const line of lines) {
        if (line.trim() === "") continue;

        const parts = line.split("~~~");
        if (parts.length >= 2) {
          const title = parts[0]?.trim() || "Untitled";
          const url = parts[1]?.trim() || "";

          if (url && url.startsWith("http")) {
            bookmarks.push({
              id: Math.random().toString(),
              url,
              title,
              lastVisited: new Date(),
            });
          }
        }
      }
    }

    return bookmarks;
  } catch (error) {
    // Log the original error for debugging
    console.error("Error in getBookmarks:", error);

    // Re-throw the original error to reveal the true cause
    throw error;
  }
};
