import { getPreferenceValues, Icon, MenuBarExtra, open } from "@raycast/api";
import { useBookmarks } from "./utils/hooks";
import { Bookmark, ReadState } from "./utils/types";
import { truncate } from "lodash";

const preferences = getPreferenceValues();

export default function MenuBookmarks() {
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
