import { List, ActionPanel, Cache, environment, Action } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState, ReactElement, useEffect } from "react";

import { readFileSync } from "fs";
import path from "path";

const cache = new Cache();
const cacheKey = (key: string) => `${environment.commandName}-${key}`;

const userDataDirectoryPath = (profile = "Default") => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library", "Application Support", "Sidekick", profile);
};

interface BookmarkItem {
  id: string;
  name: string;
  date_added: string;
  type: "url" | "folder";
  url: string;
  children?: BookmarkItem[];
}

const MAX_DEPTH = 5;
const getAllChildren = (parent: BookmarkItem, depth = 0): BookmarkItem[] =>
  (parent.children || []).flatMap((child) =>
    child.type === "folder" && depth < MAX_DEPTH ? getAllChildren(child, depth + 1) : child
  );

const getBookmarks = (): BookmarkItem[] => {
  const data: { [key: string]: BookmarkItem } = JSON.parse(
    readFileSync(`${userDataDirectoryPath()}/Bookmarks`, "utf-8")
  ).roots;
  const bookmarks = Object.values(data).flatMap(getAllChildren);
  cache.set(cacheKey("bookmarks"), JSON.stringify(bookmarks));

  return bookmarks;
};

export default function Command(): ReactElement {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cacheData = cache.get(cacheKey("bookmarks")) || "[]";
    setBookmarks(JSON.parse(cacheData));
    setIsLoading(false);

    (async () => setBookmarks(getBookmarks()))();
  }, []);

  return (
    <List isLoading={isLoading}>
      {bookmarks.map((b) => (
        <List.Item
          key={b.id}
          id={b.id}
          title={b.name}
          subtitle={b.url}
          keywords={[b.name, b.url]}
          icon={getFavicon(b.url)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={b.url} />
              <Action.CopyToClipboard
                title="Copy URL"
                content={b.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
