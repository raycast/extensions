import { getPreferenceValues, List } from "@raycast/api";
import { useThrottle } from "ahooks";
import { useMemo, useState } from "react";
import { FallbackSearchSection, PermissionError } from "./components";
import BookmarkListItem from "./components/BookmarkListItem";
import DeviceListSection from "./components/DeviceListSection";
import HistoryListItem from "./components/HistoryListItem";
import { getDeviceTabSections } from "./device-tab-sections";
import { useBookmarks, useDevices, useHistorySearch } from "./hooks";
import { GeneralBookmark, HistoryItem, Tab } from "./types";
import { search } from "./utils";

const LIMITS = { tabs: 6, bookmarks: 6, history: 8 };

const SEARCH_KEYS = [
  { name: "title", weight: 3 },
  { name: "title_formatted", weight: 2 },
  { name: "url", weight: 1 },
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const throttledSearchText = useThrottle(searchText, { wait: 200 });
  const hasSearchText = throttledSearchText.trim().length > 0;

  const { devices, permissionView, refreshDevices } = useDevices();
  const { bookmarks, hasPermission } = useBookmarks(false);
  const {
    data: historyEntries,
    permissionView: historyPermissionView,
    isLoading: isLoadingHistory,
  } = useHistorySearch(hasSearchText ? throttledSearchText : undefined);

  // Memoize the searches so re-renders triggered by unrelated state changes
  // (e.g. history results arriving) don't rebuild the Fuse indexes.
  const tabSections = useMemo(
    () =>
      getDeviceTabSections(devices ?? [], (device) => {
        const filteredTabs = search(device.tabs, SEARCH_KEYS, throttledSearchText) as Tab[];
        return hasSearchText ? filteredTabs.slice(0, LIMITS.tabs) : filteredTabs;
      }),
    [devices, throttledSearchText, hasSearchText],
  );

  const bookmarkSection = useMemo(
    () =>
      hasSearchText
        ? (search((bookmarks as GeneralBookmark[]) ?? [], SEARCH_KEYS, throttledSearchText) as GeneralBookmark[]).slice(
            0,
            LIMITS.bookmarks,
          )
        : [],
    [bookmarks, throttledSearchText, hasSearchText],
  );

  const historySection: HistoryItem[] = hasSearchText ? (historyEntries ?? []).slice(0, LIMITS.history) : [];

  if (permissionView) {
    return permissionView;
  }

  if (historyPermissionView) {
    return historyPermissionView;
  }

  if (!hasPermission) {
    return <PermissionError />;
  }

  return (
    <List
      isLoading={!devices || !bookmarks || isLoadingHistory}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tabs, bookmarks and history"
    >
      {tabSections.map(({ device, tabs }) => (
        <DeviceListSection key={device.uuid} device={device} filteredTabs={tabs} refresh={refreshDevices} />
      ))}
      {bookmarkSection.length > 0 && (
        <List.Section title="Bookmarks">
          {bookmarkSection.map((bookmark) => (
            <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />
          ))}
        </List.Section>
      )}
      {historySection.length > 0 && (
        <List.Section title="History">
          {historySection.map((entry) => (
            <HistoryListItem key={entry.id} entry={entry} searchText={throttledSearchText} />
          ))}
        </List.Section>
      )}
      <FallbackSearchSection searchText={searchText} fallbackSearchType={getPreferenceValues().fallbackSearchType} />
    </List>
  );
}
