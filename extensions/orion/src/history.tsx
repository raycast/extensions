import { List } from "@raycast/api";
import { useState } from "react";
import { groupHistoryByDay } from "./utils";
import useHistorySearch from "src/hooks/useHistorySearch";
import HistoryListSection from "src/components/HistoryListSection";
import useProfiles, { useSelectedProfileId } from "./hooks/useProfiles";
import ProfileDropdown from "./components/ProfileDropdown";

export default function Command() {
  const { profiles } = useProfiles();
  const [searchText, setSearchText] = useState<string>();
  const { selectedProfileId, setSelectedProfileId } = useSelectedProfileId("Defaults");
  const { data, isLoading, permissionView } = useHistorySearch(selectedProfileId, searchText);

  if (permissionView) {
    return permissionView;
  }

  const groupedHistoryEntries = data?.reduce(groupHistoryByDay, new Map());

  return (
    <List
      isLoading={isLoading || !profiles}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <ProfileDropdown
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onProfileSelected={setSelectedProfileId}
        />
      }
    >
      {groupedHistoryEntries &&
        Array.from(groupedHistoryEntries.entries()).map(([date, entries]) => (
          <HistoryListSection key={date} title={date} entries={entries} searchText={searchText} />
        ))}
    </List>
  );
}
