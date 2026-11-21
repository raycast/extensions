import React from "react";
import { useState, useEffect, ComponentProps, Fragment } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Grid,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  LocalStorage,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useSearch } from "./hooks/useSearch";
import { View } from "./components/View";
import { ArtistsSection } from "./components/ArtistsSection";
import { AlbumsSection } from "./components/AlbumsSection";
import { TracksSection } from "./components/TracksSection";
import { PlaylistsSection } from "./components/PlaylistsSection";
import { debounce } from "./helpers/debounce";
import { ShowsSection } from "./components/ShowsSection";
import { EpisodesSection } from "./components/EpisodesSection";

const filters = {
  all: "All",
  artists: "Artists",
  tracks: "Songs",
  albums: "Albums",
  playlists: "Playlists",
  shows: "Podcasts & Shows",
  episodes: "Episodes",
};

const musicOnlyIgnoredFilters = ["shows", "episodes"];

type FilterValue = keyof typeof filters;

// The search waiting to be saved. The debounce is created once, so each new query replaces it and restarts the wait.
let pendingSearch: string | undefined;

const savePendingSearch = debounce(async () => {
  const query = pendingSearch;
  pendingSearch = undefined;
  // It was removed from Recent Searches while it waited.
  if (!query) return;
  // Read the list when saving, not when the wait started, so changes made meanwhile aren't lost.
  const stored = await LocalStorage.getItem<string>("recent-searches");
  const searches: string[] = [query, ...(stored ? JSON.parse(stored) : [])].map((search: string) => search.trim());
  // Keep only the newest copy of each search (ignoring case), so searching again moves it to the top.
  const seen = new Set<string>();
  const unique = searches.filter((search) => {
    const key = search.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  await LocalStorage.setItem("recent-searches", JSON.stringify(unique));
}, 3000);

function saveRecentSearch(query: string) {
  pendingSearch = query;
  return savePendingSearch();
}

// Removing a search that is waiting to be saved would otherwise add it straight back. Without a search, forget any.
function forgetPendingSearch(search?: string) {
  if (search === undefined || search.trim().toLowerCase() === pendingSearch?.toLowerCase()) pendingSearch = undefined;
}

function SearchCommand({ initialSearchText }: { initialSearchText?: string }) {
  let { topView } = getPreferenceValues<Preferences.Search>();
  const { musicOnly } = getPreferenceValues<Preferences.Search>();

  if (musicOnly && musicOnlyIgnoredFilters.includes(topView)) {
    topView = "artists";
  }

  const {
    data: recentSearchesData,
    isLoading: recentSearchIsLoading,
    revalidate: recentSearchRevalidate,
  } = useCachedPromise(() => LocalStorage.getItem<string>("recent-searches"));

  const [searchText, setSearchText] = useState(initialSearchText || "");
  const [searchFilter, setSearchFilter] = useState<FilterValue>("all");
  const { searchData, searchIsLoading } = useSearch({
    query: searchText,
    options: { keepPreviousData: true },
  });

  const recentSearches: string[] = recentSearchesData ? JSON.parse(recentSearchesData) : [];

  useEffect(() => {
    const query = searchText.trim();
    if (query.length > 3 && searchIsLoading === false) {
      saveRecentSearch(query).then(() => recentSearchRevalidate());
    }
  }, [searchText, searchIsLoading]);

  const sharedProps: ComponentProps<typeof List> = {
    searchBarPlaceholder: "What do you want to listen to",
    searchText,
    onSearchTextChange: setSearchText,
    isLoading: searchIsLoading || recentSearchIsLoading,
    throttle: true,
  };

  if (!searchText) {
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
                      <Action icon={Icon.MagnifyingGlass} title="Search Again" onAction={() => setSearchText(search)} />
                      <ActionPanel.Section>
                        <Action
                          icon={Icon.Trash}
                          title="Remove Search"
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={async () => {
                            forgetPendingSearch(search);
                            await LocalStorage.setItem(
                              "recent-searches",
                              JSON.stringify(recentSearches.filter((item: string) => item !== search)),
                            );
                            recentSearchRevalidate();
                          }}
                        />
                        <Action
                          icon={Icon.Trash}
                          title="Remove All Searches"
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.RemoveAll}
                          onAction={async () => {
                            await confirmAlert({
                              title: "Are you sure?",
                              message: "This will remove all recent searches.",
                              primaryAction: {
                                title: "Remove",
                                style: Alert.ActionStyle.Destructive,
                                onAction: async () => {
                                  forgetPendingSearch();
                                  await LocalStorage.setItem("recent-searches", JSON.stringify([]));
                                  recentSearchRevalidate();
                                },
                              },
                              dismissAction: {
                                title: "Cancel",
                              },
                              rememberUserChoice: true,
                            });
                          }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ),
          )}
        </List.Section>
      </List>
    );
  }

  const sections: { key: FilterValue; component: React.JSX.Element }[] = [
    { key: "artists", component: <ArtistsSection type="list" limit={3} artists={searchData?.artists?.items} /> },
    { key: "tracks", component: <TracksSection limit={4} tracks={searchData?.tracks?.items} /> },
    { key: "albums", component: <AlbumsSection type="list" limit={6} albums={searchData?.albums?.items} /> },
    {
      key: "playlists",
      component: <PlaylistsSection type="list" limit={6} playlists={searchData?.playlists?.items} />,
    },
    { key: "shows", component: <ShowsSection type="list" limit={3} shows={searchData?.shows?.items} /> },
    { key: "episodes", component: <EpisodesSection limit={3} episodes={searchData?.episodes?.items} /> },
  ];

  const searchBarAccessory = (
    <List.Dropdown
      tooltip="Filter search"
      value={searchFilter}
      onChange={(newValue) => setSearchFilter(newValue as FilterValue)}
    >
      {Object.entries(filters).map(
        ([value, label]) =>
          (!musicOnly || (musicOnly && !musicOnlyIgnoredFilters.includes(value))) && (
            <List.Dropdown.Item key={value} title={label} value={value} />
          ),
      )}
    </List.Dropdown>
  );

  if (
    searchText &&
    (searchFilter === "all" || searchFilter === "tracks" || searchFilter === "playlists" || searchFilter === "episodes")
  ) {
    const orderedSections =
      searchFilter === "all"
        ? [
            ...sections.filter((section) => section.key === topView),
            ...sections.filter((section) => section.key !== topView),
          ]
        : sections.filter((section) => section.key === searchFilter);

    return (
      <List {...sharedProps} searchBarAccessory={searchBarAccessory}>
        {searchFilter === "all" &&
          orderedSections.map(
            ({ key, component }) =>
              (!musicOnly || (musicOnly && !musicOnlyIgnoredFilters.includes(key))) && (
                <Fragment key={key}>{component}</Fragment>
              ),
          )}

        {searchFilter === "tracks" && <TracksSection tracks={searchData?.tracks?.items} />}
        {searchFilter === "episodes" && <EpisodesSection episodes={searchData?.episodes?.items} />}

        {searchFilter === "playlists" && <PlaylistsSection type="list" playlists={searchData?.playlists?.items} />}
      </List>
    );
  }

  return (
    <Grid {...sharedProps} searchBarAccessory={searchBarAccessory}>
      {searchFilter === "artists" && <ArtistsSection type="grid" columns={5} artists={searchData?.artists?.items} />}

      {searchFilter === "albums" && <AlbumsSection type="grid" columns={5} albums={searchData?.albums?.items} />}

      {searchFilter === "shows" && <ShowsSection type="grid" columns={5} shows={searchData?.shows?.items} />}
    </Grid>
  );
}

export default function Command({ launchContext, fallbackText }: LaunchProps<{ launchContext: { query: string } }>) {
  return (
    <View>
      <SearchCommand initialSearchText={launchContext?.query ?? fallbackText} />
    </View>
  );
}
