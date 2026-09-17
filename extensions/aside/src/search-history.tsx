import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  type LaunchProps,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import { RefreshAction } from "./components/actions";
import { HistoryListItem } from "./components/history-list-item";
import { ProfileDropdown } from "./components/profile-dropdown";
import { useHistorySearch } from "./lib/history";
import { useAsideProfiles } from "./lib/profiles";

export default function SearchHistory(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { profile: configuredProfile } = getPreferenceValues<Preferences.SearchHistory>();
  const { profile, setProfile, profiles, isLoading: isLoadingProfiles } = useAsideProfiles(configuredProfile);
  const {
    data: history,
    error,
    isAvailable,
    isLoading,
    permissionView,
    revalidate,
  } = useHistorySearch(searchText, 100, profile);
  const isSearching = searchText.trim().length > 0;

  if (permissionView) return permissionView;

  return (
    <List
      isLoading={isLoading || isLoadingProfiles}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Aside browser history…"
      searchBarAccessory={<ProfileDropdown profiles={profiles} value={profile} onChange={setProfile} />}
      filtering={false}
      throttle
    >
      {!isLoading && error && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Failed to Load History"
          description={error.message}
          actions={
            <ActionPanel>
              <RefreshAction subject="History" revalidate={revalidate} />
            </ActionPanel>
          }
        />
      )}

      {!error && !isLoading && !isAvailable && (
        <List.EmptyView
          icon={Icon.Clock}
          title="History Unavailable"
          description="No readable Aside History database was found for the configured profile."
          actions={
            <ActionPanel>
              <Action title="Open Aside Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}

      {!error && isAvailable && !isLoading && history.length === 0 && (
        <List.EmptyView
          icon={Icon.Clock}
          title={isSearching ? "No History Found" : "No Recent History"}
          description={isSearching ? "No visited pages match your search." : undefined}
        />
      )}

      {!error && !isLoading && history.length > 0 && (
        <List.Section
          title={isSearching ? "History" : "Recent History"}
          subtitle={`${history.length} entr${history.length === 1 ? "y" : "ies"}`}
        >
          {history.map((entry) => (
            <HistoryListItem key={entry.id} entry={entry} revalidate={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
