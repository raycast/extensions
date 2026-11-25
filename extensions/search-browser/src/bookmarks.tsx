import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import path from "node:path";
import {
  openInSearchBrowser,
  readOptionalJSON,
  webAddress,
} from "./browser-actions";

const SUPPORT_DIRECTORY = path.join(
  process.env.HOME ?? "",
  "Library",
  "Application Support",
  "Search",
);

interface BookmarkNode {
  id?: string;
  title?: string;
  url?: string;
  children?: BookmarkNode[];
}

interface FlattenedBookmark {
  id: string;
  title: string;
  url: string;
  folder: string;
}

function parseBookmarks(value: unknown): FlattenedBookmark[] {
  if (!Array.isArray(value))
    throw new Error("Unexpected bookmarks file format.");

  const bookmarks: FlattenedBookmark[] = [];
  const visit = (
    nodes: unknown[],
    folderPath: string,
    ancestors: Set<object>,
  ) => {
    for (const value of nodes) {
      if (!value || typeof value !== "object" || ancestors.has(value)) continue;
      const descendants = new Set(ancestors).add(value);
      const node = value as BookmarkNode;
      const title = typeof node.title === "string" ? node.title.trim() : "";
      const url = webAddress(node.url);
      if (url) {
        bookmarks.push({
          id: typeof node.id === "string" ? node.id : url,
          title: title || new URL(url).hostname,
          url,
          folder: folderPath,
        });
      } else if (Array.isArray(node.children)) {
        visit(
          node.children,
          [folderPath, title].filter(Boolean).join(" / "),
          descendants,
        );
      }
    }
  };
  visit(value, "", new Set());
  return bookmarks;
}

async function loadBookmarks(): Promise<FlattenedBookmark[]> {
  const value = await readOptionalJSON(
    path.join(SUPPORT_DIRECTORY, "bookmarks.json"),
  );
  if (value === undefined) return [];
  return parseBookmarks(value);
}

export default function Bookmarks() {
  const { data, isLoading, error, revalidate } = usePromise(loadBookmarks);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Search Browser bookmarks"
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Load Bookmarks"
          description="Check that Search Browser's bookmarks.json file is readable and valid."
        />
      ) : (data ?? []).length === 0 ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No Bookmarks Found"
          description="Bookmarks you save in Search Browser will appear here."
        />
      ) : (
        (data ?? []).map((bookmark) => (
          <List.Item
            key={bookmark.id}
            title={bookmark.title}
            subtitle={bookmark.folder || new URL(bookmark.url).hostname}
            keywords={[bookmark.url, bookmark.folder]}
            icon={Icon.Bookmark}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Search Browser"
                  icon={Icon.Globe}
                  onAction={() =>
                    openInSearchBrowser(bookmark.url).catch(
                      (actionError: unknown) =>
                        showFailureToast(actionError, {
                          title: "Couldn't Open Bookmark",
                        }),
                    )
                  }
                />
                <Action.OpenInBrowser url={bookmark.url} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={bookmark.url}
                />
                <Action
                  title="Refresh Bookmarks"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
