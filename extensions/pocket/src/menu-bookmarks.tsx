import { Icon, MenuBarExtra, open } from "@raycast/api";
import { truncate } from "lodash";
import { Bookmark, ReadState } from "./lib/api";
import { View } from "./lib/oauth/view";
import { preferences } from "./lib/preferences";
import { useBookmarks } from "./lib/hooks/use-bookmarks";

function MenuBookmarks() {
  const { bookmarks: unreadBookmarks, loading: loadingUnread } = useBookmarks({
    state: ReadState.Unread,
    count: 6,
  });

  const { bookmarks: archivedBookmarks, loading: loadingArchived } = useBookmarks({
    state: ReadState.Archive,
    count: 6,
  });

  const loading = loadingUnread || loadingArchived;

  const openBookmark = (bookmark: Bookmark) => {
    if (preferences.defaultOpen === "pocket-website") {
      open(bookmark.pocketUrl);
    } else {
      open(bookmark.originalUrl);
    }
  };

  return (
    <MenuBarExtra isLoading={loading} icon={Icon.Bookmark} tooltip="Latest Bookmarks">
      <MenuBarExtra.Item title="Unread" />
      {unreadBookmarks.map((bookmark) => (
        <MenuBarExtra.Item
          key={bookmark.id}
          title={truncate(bookmark.title, { length: 42 })}
          onAction={() => openBookmark(bookmark)}
        />
      ))}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Archived" />
      {archivedBookmarks.map((bookmark) => (
        <MenuBarExtra.Item
          key={bookmark.id}
          title={truncate(bookmark.title, { length: 42 })}
          onAction={() => openBookmark(bookmark)}
        />
      ))}
    </MenuBarExtra>
  );
}

export default function Command() {
  return (
    <View>
      <MenuBookmarks />
    </View>
  );
}
