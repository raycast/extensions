import { Action, ActionPanel, Icon, Image, List, type LaunchProps } from "@raycast/api";
import { getAvatarIcon, useFetch } from "@raycast/utils";
import { useEffect, useState, useMemo, useCallback } from "react";
import { UserPage } from "./components/user-page";
import { useBatchHeadshot } from "./hooks/user-headshots";

type SearchResponse = {
  searchResults: Array<{
    contentGroupType: string;
    contents: Array<{
      username: string;
      displayName: string;
      previousUsernames: string[] | null;
      hasVerifiedBadge: boolean;
      contentType: string;
      contentId: number;
      defaultLayoutData: null;
    }>;
    topicId: string;
  }>;
  nextPageToken: string;
  filteredSearchQuery: string | null;
  vertical: string;
  sorts: null;
  paginationMethod: null;
};

type UserData = {
  id: number;
  username: string;
  displayName: string;
  verified: boolean;
};

export default (props: LaunchProps<{ arguments: Arguments.SearchUsers }>) => {
  const { startingQuery } = props.arguments;

  const [searchText, setSearchText] = useState(startingQuery ?? "");
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: searchResults, isLoading: searchResultsLoading } = useFetch<SearchResponse>(
    `https://apis.roblox.com/search-api/omni-search?verticalType=user&searchQuery=${encodeURIComponent(debouncedSearchText)}&pageToken=&sessionId=1&pageType=all`,
  );

  const users = useMemo(() => {
    if (searchResultsLoading || !searchResults) {
      return [];
    }

    const newUsers: UserData[] = [];

    searchResults.searchResults.forEach((result) => {
      if (result.contentGroupType == "User") {
        result.contents.forEach((content) => {
          newUsers.push({
            id: content.contentId,
            username: content.username,
            displayName: content.displayName,
            verified: content.hasVerifiedBadge,
          });
        });
      }
    });

    return newUsers;
  }, [searchResults, searchResultsLoading]);

  const { data: headshots, isLoading: headshotsLoading } = useBatchHeadshot(users.map((user) => user.id));

  const handleSearchTextChange = useCallback((newSearchText: string) => {
    setSearchText(newSearchText);
  }, []);

  return (
    <List
      isLoading={searchResultsLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      navigationTitle="Search Users"
      searchBarPlaceholder="Search"
      filtering={false}
    >
      {users.map((user) => (
        <UserListItem key={user.id} user={user} headshotURL={(!headshotsLoading && headshots[user.id]) || null} />
      ))}
    </List>
  );
};

function UserListItem({ user, headshotURL }: { user: UserData; headshotURL: string | null }) {
  const { id: userId, username, displayName, verified } = user;

  const userIcon: Image.ImageLike = headshotURL || getAvatarIcon(displayName);

  const accesories = [];
  if (verified) {
    accesories.push({ icon: "verified.png" });
  }

  return (
    <List.Item
      title={username}
      subtitle={displayName}
      icon={userIcon}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.AppWindow} title="View" target={<UserPage userId={userId} copyField="UserID" />} />
        </ActionPanel>
      }
      accessories={accesories}
    />
  );
}
