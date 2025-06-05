import { runAppleScriptSync } from "run-applescript";
import { List, Action, ActionPanel } from "@raycast/api";
import { Bookmark } from "./type";
import fs from "fs";
import React from "react";
import BookmarkListSection from "./BookmarkListSection";

const convertLineSeparatedToBookmarks = (input: string) => {
  const lines = input.trim().split("\n");

  // Bookmarks are separated by linefeed, each bookmark has 3 lines: title, address, path
  const bookmarks = [];
  for (let bookmarkIndex = 0; bookmarkIndex + 2 < lines.length; bookmarkIndex += 3) {
    bookmarks.push({
      title: lines[bookmarkIndex],
      address: lines[bookmarkIndex + 1],
      path: lines[bookmarkIndex + 2],
    });
  }

  return bookmarks as Bookmark[];
};

export async function getBookmarks() {
  const response = runAppleScriptSync(`
    set linefeed to ASCII character 10
    set _output to ""
  
    tell application "Hookmark"
      set _bookmark_name_list to name of every bookmark
      set _bookmark_addr_list to address of every bookmark
      set _bookmark_path_list to path of every bookmark
  
      set _bookmark_count to count of _bookmark_name_list
      
      repeat with i from 1 to _bookmark_count
        set _name to item i of _bookmark_name_list
        set _address to item i of _bookmark_addr_list
        set _path to item i of _bookmark_path_list

        set _output to (_output & _name & linefeed & _address & linefeed & _path)

        if i < _bookmark_count then
          set _output to (_output & linefeed)
        end if
      end repeat
    end tell
    
    return _output
    `);

  if (!response) return undefined;

  return convertLineSeparatedToBookmarks(response);
}

export function openInHook(name: string, address: string) {
  const script = `
    tell application "Hookmark"
      set targetBookmark to make bookmark with properties {name:"${name}", address:"${address}"}
      invoke on targetBookmark
    end tell
  `;
  runAppleScriptSync(script);
}

/**
 * Fetch hooked bookmarks for a given AppleScript snippet that returns line-separated title, address, path triples.
 */
export function fetchHookedBookmarksFromAppleScript(script: string): Bookmark[] {
  const response = runAppleScriptSync(script);

  if (!response) return [];

  return convertLineSeparatedToBookmarks(response);
}

export function HookedBookmarksList({ bookmarks }: { bookmarks: Bookmark[] }) {
  return (
    <List isShowingDetail>
      <BookmarkListSection
        title="Hooked Bookmarks:"
        bookmarks={bookmarks}
        renderActions={(bookmark) => (
          <ActionPanel>
            <Action title="Open in Hookmark" onAction={() => openInHook(bookmark.title, bookmark.address)} />
          </ActionPanel>
        )}
        isFileSection={false}
      />
    </List>
  );
}

export function getHookIconPath() {
  const HookPath = "/System/Volumes/Data/Applications/Hookmark.app";
  const HookPathSetapp = "/System/Volumes/Data/Applications/Setapp/Hookmark.app";
  let iconPath = "";
  if (fs.existsSync(HookPath)) {
    iconPath = HookPath;
  }

  if (fs.existsSync(HookPathSetapp)) {
    iconPath = HookPathSetapp;
  }
  return iconPath;
}
