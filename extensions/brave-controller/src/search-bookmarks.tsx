import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { readFile } from "fs/promises";
import { join } from "path";

interface BookmarkNode {
  id: string;
  name: string;
  type: "url" | "folder";
  url?: string;
  children?: BookmarkNode[];
}

interface FlatBookmark {
  id: string;
  name: string;
  url: string;
  path: string; // Folder structure (e.g., "Bar > Tech")
}

export default function Command() {
  const [bookmarks, setBookmarks] = useState<FlatBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBookmarks() {
      try {
        // Standard Path for Brave on macOS
        const bookmarksPath = join(
          homedir(),
          "Library",
          "Application Support",
          "BraveSoftware",
          "Brave-Browser",
          "Default",
          "Bookmarks",
        );

        const data = await readFile(bookmarksPath, "utf8");
        const json = JSON.parse(data);

        const flatList: FlatBookmark[] = [];

        // Helper to recursively parse the bookmark tree
        const traverse = (node: BookmarkNode, path: string) => {
          if (node.type === "url" && node.url) {
            flatList.push({
              id: node.id,
              name: node.name,
              url: node.url,
              path: path,
            });
          } else if (node.children) {
            node.children.forEach((child) => {
              // Don't add root folder names to path to keep it clean
              const newPath = ["root", "other", "synced"].includes(node.name.toLowerCase())
                ? ""
                : path
                  ? `${path} / ${node.name}`
                  : node.name;

              traverse(child, newPath);
            });
          }
        };

        // Brave has 'roots' for Bar, Other, and Synced
        if (json.roots) {
          const roots = json.roots as Record<string, BookmarkNode>;
          Object.values(roots).forEach((root) => traverse(root, ""));
        }

        setBookmarks(flatList);
      } catch (error) {
        console.error("Error reading bookmarks:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBookmarks();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Brave bookmarks...">
      {bookmarks.map((bookmark) => (
        <List.Item
          key={bookmark.id}
          icon={Icon.Globe}
          title={bookmark.name}
          subtitle={bookmark.path} // Shows the folder structure
          accessories={[{ text: new URL(bookmark.url).hostname.replace("www.", "") }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={bookmark.url} title="Open in Brave" />
              <Action.CopyToClipboard content={bookmark.url} title="Copy URL" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
