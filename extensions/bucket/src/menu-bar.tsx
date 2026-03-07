import React from "react";
import {
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getBookmarks, Bookmark } from "./lib/api";

const MAX_ITEMS = 10;

export default function BucketMenuBar() {
  const {
    data: bookmarks,
    isLoading,
    revalidate,
  } = useCachedPromise(getBookmarks, [], {
    keepPreviousData: true,
  });

  const recent = (bookmarks ?? []).slice(0, MAX_ITEMS);
  const featured = (bookmarks ?? [])
    .filter((b) => b.featured)
    .slice(0, MAX_ITEMS);

  return (
    <MenuBarExtra
      icon={Icon.Bookmark}
      tooltip="Bucket Bookmarks"
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        title="Save from Clipboard"
        icon={Icon.Plus}
        onAction={() =>
          launchCommand({
            name: "save-bookmark",
            type: LaunchType.UserInitiated,
          })
        }
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
      <MenuBarExtra.Item
        title="Search Bookmarks"
        icon={Icon.MagnifyingGlass}
        onAction={() =>
          launchCommand({
            name: "search-bookmarks",
            type: LaunchType.UserInitiated,
          })
        }
      />
      <MenuBarExtra.Separator />

      {featured.length > 0 && (
        <>
          <MenuBarExtra.Section title="⭐ Featured">
            {featured.map((b) => (
              <BookmarkMenuItem bookmark={b} key={b._id} />
            ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Separator />
        </>
      )}

      <MenuBarExtra.Section title="Recent">
        {recent.length === 0 && !isLoading ? (
          <MenuBarExtra.Item title="No bookmarks yet" />
        ) : (
          recent.map((b) => <BookmarkMenuItem bookmark={b} key={b._id} />)
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={async () => {
          revalidate();
          await showHUD("Bookmarks refreshed");
        }}
      />
    </MenuBarExtra>
  );
}

function BookmarkMenuItem({ bookmark }: { bookmark: Bookmark }) {
  const domain = (() => {
    try {
      return new URL(bookmark.url).hostname;
    } catch {
      return bookmark.url;
    }
  })();

  return (
    <MenuBarExtra.Item
      icon={bookmark.favicon ? { source: bookmark.favicon } : Icon.Link}
      title={bookmark.title || domain}
      subtitle={domain}
      tooltip={bookmark.url}
      onAction={() => open(bookmark.url)}
    />
  );
}
