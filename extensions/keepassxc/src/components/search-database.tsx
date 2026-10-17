import { useState, useEffect } from "react";
import { JSX } from "react/jsx-runtime";
import { List } from "@raycast/api";

import Entry from "./entry";
import FolderFilterDropdown from "./folder-filter-dropdown";
import { KeePassLoader, showToastKeepassxcCliErrors } from "../utils/keepass-loader";
import { PinLoader } from "../utils/pin-loader";
import { getEntryId, getFolders } from "../utils/entry-helper";

/**
 * Component for searching and displaying KeePass database entries
 *
 * This component loads entries from the cache and updates them by refreshing the cache.
 * It displays the entries in a searchable list format. Users can perform actions such as
 * pasting or copying passwords, usernames, and TOTP, as well as opening URLs associated
 * with entries. If an error occurs, the database is locked, and an error message is shown
 *
 * @param {Object} props - The component props
 * @param {(isUnlocked: boolean) => void} props.setIsUnlocked - A function to update the lock status of the database
 * @returns {JSX.Element} - The search interface for KeePass database entries
 */
export default function SearchDatabase({
  setIsUnlocked,
}: {
  setIsUnlocked: (isUnlocked: boolean) => void;
}): JSX.Element {
  const [entries, setEntries] = useState<string[][]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [entriesFolder, setEntriesFolder] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const errorHandler = (e: { message: string }) => {
    setIsUnlocked(false);
    showToastKeepassxcCliErrors(e);
  };

  useEffect(() => {
    let currentPinnedIds: Set<string>;

    PinLoader.loadPinnedIdsCache()
      .then((pinnedIds) => {
        currentPinnedIds = pinnedIds;
        setPinnedIds(pinnedIds);
      })
      .then(KeePassLoader.loadEntriesCache)
      .then((entries) => {
        setEntries(entries);
        setFolders(getFolders(entries));
      })
      .then(KeePassLoader.refreshEntriesCache)
      .then((entries) => {
        setIsLoading(false);
        setEntries(entries);
        setFolders(getFolders(entries));
        return PinLoader.cleanPinnedIds(entries, currentPinnedIds);
      }, errorHandler)
      .then((cleanedPinnedIds) => {
        if (cleanedPinnedIds) setPinnedIds(cleanedPinnedIds);
      });
  }, []);

  const filteredEntries = entries.filter((entry) => entry[0].startsWith(entriesFolder) && entry[1] !== "");
  const pinnedEntries = filteredEntries.filter((entry) => pinnedIds.has(getEntryId(entry)));
  const unpinnedEntries = filteredEntries.filter((entry) => !pinnedIds.has(getEntryId(entry)));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search in KeePassXC"
      searchBarAccessory={
        folders.length > 0 ? <FolderFilterDropdown folders={folders} onFolderChange={setEntriesFolder} /> : undefined
      }
      throttle={true}
    >
      {pinnedEntries.length > 0 && (
        <List.Section title="Favorites">
          {pinnedEntries.map((entry, i) => (
            <Entry key={i} entry={entry} pinnedIds={pinnedIds} setPinnedIds={setPinnedIds} />
          ))}
        </List.Section>
      )}
      {unpinnedEntries.length > 0 && (
        <List.Section title={pinnedEntries.length > 0 ? "Other Entries" : undefined}>
          {unpinnedEntries.map((entry, i) => (
            <Entry key={i} entry={entry} pinnedIds={pinnedIds} setPinnedIds={setPinnedIds} />
          ))}
        </List.Section>
      )}
      <List.EmptyView
        title="No Entries Found"
        description={entries.length === 0 ? "Your database seems empty" : "Try adjusting your search"}
      />
    </List>
  );
}
