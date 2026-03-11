import fs from "fs";
import os from "os";

import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import yaml from "js-yaml";

interface Bookmark {
  title: string;
  url: string;
}

interface Config {
  bookmarks: Bookmark[];
}

function expandPath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return filePath.replace("~", os.homedir());
  }
  return filePath;
}

function loadBookmarks(configPath: string): { bookmarks: Bookmark[]; error?: string } {
  try {
    const resolvedPath = expandPath(configPath);
    const content = fs.readFileSync(resolvedPath, "utf-8");
    const config = yaml.load(content) as Config;

    if (!config || !Array.isArray(config.bookmarks)) {
      return { bookmarks: [], error: "Invalid config: 'bookmarks' array not found" };
    }

    const valid = config.bookmarks.filter((b) => b.title && b.url);
    return { bookmarks: valid };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { bookmarks: [], error: message };
  }
}

export default function Command() {
  const { configPath } = getPreferenceValues<Preferences>();
  const { bookmarks, error } = loadBookmarks(configPath);

  if (error) {
    void showToast({ style: Toast.Style.Failure, title: "Failed to load bookmarks", message: error });
  }

  return (
    <List searchBarPlaceholder="Search bookmarks..." throttle>
      <List.EmptyView
        title={error ? "Failed to load bookmarks" : "No bookmarks found"}
        description={error || "Add bookmarks to your config.yaml file to get started."}
      />
      {bookmarks.map((bookmark, index) => (
        <List.Item
          key={`${bookmark.title}-${index}`}
          title={bookmark.title}
          subtitle={bookmark.url}
          icon={getFavicon(bookmark.url)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={bookmark.url} />
              <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
