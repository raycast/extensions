import { Action, ActionPanel, Alert, confirmAlert, Icon, List, LocalStorage } from "@raycast/api";
import { AlbumSection } from "./albumSection";
import { ArtistSection } from "./artistSection";
import { PlaylistSection } from "./playlistSection";
import { SearchDropdown } from "./searchDropdown";
import { TrackSection } from "./trackSection";
import { VideoSection } from "./videoSection";
import { SearchCommandProps, RecentSearchResultProps } from "../types";

export const SearchCommand = ({
  searchText,
  searchData,
  searchAgain,
  sharedProps,
  recentSearches,
  onSearchFilterChange,
  revalidateRecentSearch,
}: SearchCommandProps) => {
  // const {
  //   data: replaceYTTabData,
  //   isLoading,
  //   revalidate,
  // } = useCachedPromise(async () => LocalStorage.getItem<string>("replace-yt-tab"), []);

  if (!searchText) {
    return (
      <RecentSearchResult
        {...{
          recentSearches,
          searchAgain,
          revalidateRecentSearch,
          sharedProps,
        }}
      />
    );
  }

  // const replaceTabOptions = {
  //   title: "Replace YouTube music tab",
  //   message: "Do you want to replace an existing YouTube music tab with the URL?",
  //   primaryAction: {
  //     title: "Yes, please.",
  //     style: Alert.ActionStyle.Default,
  //     onAction: async () => {
  //       await LocalStorage.setItem("replace-yt-tab", JSON.stringify(true));
  //     },
  //   },
  //   dismissAction: {
  //     title: "No, thanks.",
  //   },
  // };

  // const replaceYTTab = async () => {
  //   await confirmAlert(replaceTabOptions);
  // };

  if (searchText) {
    return (
      <List {...sharedProps} searchBarAccessory={<SearchDropdown {...{ onSearchFilterChange }} />}>
        <TrackSection data={searchData.tracks} />
        <ArtistSection data={searchData.artists} />
        <AlbumSection data={searchData.albums} />
        <VideoSection data={searchData.videos} />
        <PlaylistSection data={searchData.playlists} />
      </List>
    );
  }
};

const RecentSearchResult = ({
  sharedProps,
  recentSearches,
  revalidateRecentSearch,
  searchAgain,
}: RecentSearchResultProps) => {
  const clearStorageAction = async () => {
    await confirmAlert({
      title: "Clear recent searches",
      message: "Are you sure you want to clear your recent searches?",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          await LocalStorage.setItem("recent-searches", JSON.stringify([]));
          revalidateRecentSearch();
        },
      },
      dismissAction: {
        title: "Cancel",
      },
    });
  };

  const removeSearchTermFromStorageAction = async (searchTerm: string) => {
    await confirmAlert({
      title: "Remove this search",
      message: "Are you sure you want to clear your recent searches?",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          const searches = recentSearches.filter((search) => search !== searchTerm);
          await LocalStorage.setItem("recent-searches", JSON.stringify(searches));
          revalidateRecentSearch();
        },
      },
      dismissAction: {
        title: "Cancel",
      },
    });
  };

  return (
    <List {...sharedProps}>
      <List.EmptyView title="What do you want to search for?" />
      <List.Section title="Recent searches">
        {recentSearches.map((search) => (
          <List.Item
            key={search}
            title={search}
            actions={
              <ActionPanel>
                <Action icon={Icon.MagnifyingGlass} title="Search Again" onAction={() => searchAgain(search)} />
                <ActionPanel.Section>
                  <Action
                    icon={Icon.Trash}
                    title="Remove this search"
                    onAction={() => removeSearchTermFromStorageAction(search)}
                    style={Action.Style.Destructive}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Remove all searches"
                    onAction={clearStorageAction}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};
