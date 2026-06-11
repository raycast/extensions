import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { searchProfiles, fetchPublicProfile, fetchLeaderboard } from "./api/traders";
import { PublicProfile } from "./features/traders/types";
import { ProfileListItem } from "./features/traders/components/ProfileListItem";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data: searchResults, isLoading: isSearchLoading } = useCachedPromise(
    async (query) => {
      if (!query || query.length < 3) return [];

      if (query.startsWith("0x") && query.length === 42) {
        try {
          const profile = await fetchPublicProfile(query);
          return [profile];
        } catch (e) {
          return [];
        }
      } else {
        return searchProfiles(query);
      }
    },
    [searchText],
    {
      keepPreviousData: true,
      initialData: [],
      execute: searchText.length >= 3 || (searchText.startsWith("0x") && searchText.length === 42),
    },
  );

  const { data: leaderboard, isLoading: isLeaderboardLoading } = useCachedPromise(
    async () => {
      return fetchLeaderboard("", "OVERALL", "DAY", 20);
    },
    [],
    {
      execute: searchText.length === 0,
      initialData: [],
    },
  );

  const isLoading = isSearchLoading || isLeaderboardLoading;

  let profilesToRender = searchResults;
  let sectionTitle = "Search Results";

  if (searchText.length === 0) {
    sectionTitle = "Today's Top 20 Traders";
    profilesToRender = leaderboard.map((entry) => ({
      proxyWallet: entry.proxyWallet,
      profileImage: entry.profileImage,
      displayUsernamePublic: true,
      bio: null,
      pseudonym: entry.userName || "Unknown",
      name: entry.userName || "Unknown",
      xUsername: entry.xUsername,
      verifiedBadge: entry.verifiedBadge,
    })) as PublicProfile[];
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by Wallet Address (0x...) or Username..."
      throttle
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={
          searchText.length > 0
            ? "No profile found"
            : isLeaderboardLoading
              ? "Loading Leaderboard..."
              : "No traders available"
        }
        description={
          searchText.length > 0
            ? "Try a different wallet address or username."
            : isLeaderboardLoading
              ? "Fetching today's top traders."
              : "No leaderboard data could be loaded."
        }
      />
      {profilesToRender && profilesToRender.length > 0 && (
        <List.Section title={sectionTitle} subtitle={`${profilesToRender.length}`}>
          {profilesToRender.map((profile) => (
            <ProfileListItem key={profile.proxyWallet} profile={profile} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
