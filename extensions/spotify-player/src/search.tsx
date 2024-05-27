import { useState, useEffect, ComponentProps, Fragment } from "react";
import { Action, ActionPanel, Grid, Icon, LaunchProps, List, LocalStorage, getPreferenceValues } from "@raycast/api";
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

type FilterValue = keyof typeof filters;

function SearchCommand({ initialSearchText }: { initialSearchText?: string }) {
  const { topView } = getPreferenceValues<Preferences.Search>();

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
    if (searchText.length > 3 && recentSearches.includes(searchText.trim()) === false && searchIsLoading === false) {
      const addSearchToStorage = debounce(async () => {
        LocalStorage.setItem("recent-searches", JSON.stringify([searchText, ...recentSearches]));
        recentSearchRevalidate();
      }, 3000);
      addSearchToStorage();
    }
  }, [searchText, searchIsLoading]);

  const sharedProps: ComponentProps<typeof List> = {
    searchBarPlaceholder: "What do you want to listen to",
    searchText,
    onSearchTextChange: setSearchText,
    isLoading: searchIsLoading || recentSearchIsLoading,
    throttle: true,
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
                      <Action icon={Icon.MagnifyingGlass} title="Search Again" onAction={() => setSearchText(search)} />
                      <Action
                        icon={Icon.Trash}
                        title="Remove Search"
                        onAction={async () => {
                          await LocalStorage.setItem(
                            "recent-searches",
                            JSON.stringify(recentSearches.filter((item: string) => item !== search)),
                          );
                          recentSearchRevalidate();
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ),
          )}
        </List.Section>
      </List>
    );
  }

  const sections: { key: FilterValue; component: JSX.Element }[] = [
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
        {searchFilter === "all" &&
          orderedSections.map(({ key, component }) => <Fragment key={key}>{component}</Fragment>)}

        {searchFilter === "tracks" && <TracksSection tracks={searchData?.tracks?.items} />}
        {searchFilter === "episodes" && <EpisodesSection episodes={searchData?.episodes?.items} />}

        {searchFilter === "playlists" && <PlaylistsSection type="list" playlists={searchData?.playlists?.items} />}
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
