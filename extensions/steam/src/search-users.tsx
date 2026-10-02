import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { MIN_QUERY_LENGTH, SearchEmptyView } from "./components/SearchEmptyView";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { SteamUserDetails } from "./components/SteamUserDetails";
import { WebApiKeyNotice } from "./errors";
import { markKeyAccepted, markKeyRejected, useKeyRejected } from "./lib/hooks";
import {
  cleanSteamUserQuery,
  getPersonaStateText,
  getProfileVisibilityText,
  getSteamWebApiKey,
  hasSteamWebApiKey,
  isRejectedKeyError,
  searchSteamUsers,
  SteamUserSearchResult,
} from "./lib/users";

export default function Command() {
  const [search, setSearch] = useState("");
  const hasApiKey = hasSteamWebApiKey();
  const query = cleanSteamUserQuery(search);
  const shouldSearch = hasApiKey && query.length >= MIN_QUERY_LENGTH;
  const keyRejected = useKeyRejected();
  const { data, error, isLoading } = useCachedPromise(
    (term: string) => searchSteamUsers(term, { maxResults: 20 }),
    [query],
    // The empty view explains the failure, so skip the default toast
    {
      execute: shouldSearch && !keyRejected,
      keepPreviousData: true,
      onError: (failure) => {
        if (isRejectedKeyError(failure)) markKeyRejected(getSteamWebApiKey());
      },
      onData: () => markKeyAccepted(getSteamWebApiKey()),
    },
  );

  if (!hasApiKey || keyRejected || isRejectedKeyError(error)) {
    return <WebApiKeyNotice />;
  }

  return (
    <List
      isLoading={Boolean(shouldSearch && isLoading)}
      onSearchTextChange={setSearch}
      throttle
      filtering={false}
      selectedItemId={shouldSearch && data?.results[0] ? `${data.results[0].steamid}:${query}` : undefined}
      searchBarPlaceholder="Search users by name, Steam ID, or profile URL..."
    >
      <SearchEmptyView
        noun="Users"
        icon={Icon.PersonCircle}
        query={query}
        isLoading={shouldSearch && isLoading}
        error={error}
        keyRejected={isRejectedKeyError(error)}
      />
      {shouldSearch && data?.results.length ? (
        <List.Section
          title="Search Results"
          subtitle={
            data.totalCount !== undefined ? `${data.totalCount.toLocaleString()} Steam Community matches` : undefined
          }
        >
          {data.results.map((user) => (
            <SteamUserListItem key={user.steamid} user={user} search={query} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function SteamUserListItem({ user, search }: { user: SteamUserSearchResult; search: string }) {
  const status = user.gameextrainfo ? `Playing ${user.gameextrainfo}` : getPersonaStateText(user.personastate);

  return (
    <List.Item
      id={`${user.steamid}:${search}`}
      title={user.personaname}
      icon={user.avatarmedium ? { source: user.avatarmedium } : Icon.Person}
      accessories={[
        { text: status },
        { text: getProfileVisibilityText(user.communityvisibilitystate) },
        { text: matchTypeLabel(user.matchType) },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.PersonCircle}
            title="View User Details"
            target={<SteamUserDetails steamid={user.steamid} />}
          />
          <Action.OpenInBrowser icon={Icon.Globe} title="Open Profile in Browser" url={user.profileurl} />
          <Action.CopyToClipboard icon={Icon.CopyClipboard} title="Copy Steam ID" content={user.steamid} />
          <Action.CopyToClipboard icon={Icon.Link} title="Copy Profile URL" content={user.profileurl} />
        </ActionPanel>
      }
    />
  );
}

function matchTypeLabel(matchType: SteamUserSearchResult["matchType"]) {
  switch (matchType) {
    case "steamid":
      return "Steam ID";
    case "vanity":
      return "Vanity";
    case "community-search":
      return "Search";
  }
}
