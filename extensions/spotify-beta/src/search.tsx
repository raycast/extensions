import { useState, useEffect } from "react";
import { Action, ActionPanel, Grid, Icon, List, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useSearch } from "./hooks/useSearch";
import { View } from "./components/View";
import { ArtistsSection } from "./components/ArtistsSection";
import { AlbumsSection } from "./components/AlbumsSection";
import { TracksSection } from "./components/TracksSection";
import { PlaylistsSection } from "./components/PlaylistsSection";
import { debounce } from "./helpers/debounce";
import { ShowsSection } from "./components/ShowsSection";
import { EpisodesSection } from "./components/EpisodessSection";

const filters = {
  all: "All",
  artists: "Artists",
  tracks: "Songs",
  albums: "Albums",
  playlists: "Playlists",
  shows: "Podcasts",
  episodes: "Episodes",
};

type FilterValue = keyof typeof filters;

function SearchCommand() {
  const {
    data: recentSearchesData,
    isLoading: recentSearchIsLoading,
    revalidate: recentSearchRevalidate,
  } = usePromise(() => LocalStorage.getItem<string>("recent-searches"));
  const [searchText, setSearchText] = useState("");
  const [searchFilter, setSearchFilter] = useState<FilterValue>("all");
  const { searchData, searchIsLoading } = useSearch({
    query: searchText,
    limit: 32,
    options: { keepPreviousData: true },
  });

  const recentSearches: string[] = recentSearchesData ? JSON.parse(recentSearchesData) : [];

  useEffect(() => {
    if (searchText.length > 3 && recentSearches.includes(searchText.trim()) === false && searchIsLoading === false) {
      const addSearchToStorage = debounce(async () => {
        LocalStorage.setItem("recent-searches", JSON.stringify([searchText, ...recentSearches]));
        recentSearchRevalidate();
      }, 3000);
      addSearchToStorage();
    }
  }, [searchText, searchIsLoading]);

  const sharedProps = {
    searchBarPlaceholder: "What do you want to listen to",
    onSearchTextChange: setSearchText,
    isLoading: searchIsLoading || recentSearchIsLoading,
    throttle: true,
    searchText,
  };

  if (Boolean(searchText) === false) {
    return (
      <List {...sharedProps}>
        <List.EmptyView title="What do you want to listen to?" />
        <List.Section title="Recent searches">
          {recentSearches.map(
            (search, index) =>
              index < 10 && (
                <List.Item
                  key={search}
                  title={search}
                  actions={
                    <ActionPanel>
                      <Action icon={Icon.MagnifyingGlass} title="Search again" onAction={() => setSearchText(search)} />
                      <Action
                        icon={Icon.Trash}
                        title="Remove search"
                        onAction={async () => {
                          await LocalStorage.setItem(
                            "recent-searches",
                            JSON.stringify(recentSearches.filter((item: string) => item !== search))
                          );
                          recentSearchRevalidate();
                        }}
                      />
                    </ActionPanel>
                  }
                />
              )
          )}
        </List.Section>
      </List>
    );
  }

  if (
    searchText &&
    (searchFilter === "all" || searchFilter === "tracks" || searchFilter === "playlists" || searchFilter === "episodes")
  ) {
    return (
      <List
        {...sharedProps}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Filter search"
            value={searchFilter}
            onChange={(newValue) => setSearchFilter(newValue as FilterValue)}
          >
            {Object.entries(filters).map(([value, label]) => (
              <List.Dropdown.Item key={value} title={label} value={value} />
            ))}
          </List.Dropdown>
        }
      >
        {searchFilter === "all" && (
          <>
            <ArtistsSection type="list" limit={3} columns={5} artists={searchData?.artists?.items} />
            <TracksSection limit={6} tracks={searchData?.tracks?.items} />
            <AlbumsSection type="list" limit={6} columns={8} albums={searchData?.albums?.items} />
            <PlaylistsSection type="list" limit={6} columns={8} playlists={searchData?.playlists?.items} />
            <ShowsSection type="list" limit={3} columns={8} shows={searchData?.shows?.items} />
            <EpisodesSection limit={3} episodes={searchData?.episodes?.items} />
          </>
        )}

        {searchFilter === "tracks" && <TracksSection tracks={searchData?.tracks?.items} />}
        {searchFilter === "episodes" && <EpisodesSection episodes={searchData?.episodes?.items} />}

        {searchFilter === "playlists" && (
          <PlaylistsSection type="list" columns={6} playlists={searchData?.playlists?.items} />
        )}
      </List>
    );
  }

  return (
    <Grid
      {...sharedProps}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter search"
          value={searchFilter}
          onChange={(newValue) => setSearchFilter(newValue as FilterValue)}
        >
          {Object.entries(filters).map(([value, label]) => (
            <Grid.Dropdown.Item key={value} title={label} value={value} />
          ))}
        </Grid.Dropdown>
      }
    >
      {searchFilter === "artists" && <ArtistsSection type="grid" columns={5} artists={searchData?.artists?.items} />}

      {searchFilter === "albums" && <AlbumsSection type="grid" columns={6} albums={searchData?.albums?.items} />}

      {searchFilter === "shows" && <ShowsSection type="grid" columns={6} shows={searchData?.shows?.items} />}
    </Grid>
  );
}

export default function Command() {
  return (
    <View>
      <SearchCommand />
    </View>
  );
}
