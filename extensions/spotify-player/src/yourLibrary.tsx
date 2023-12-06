import { useState } from "react";
import { Grid, List, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { View } from "./components/View";
import { useYourLibrary } from "./hooks/useYourLibrary";
import { ArtistsSection } from "./components/ArtistsSection";
import { AlbumsSection } from "./components/AlbumsSection";
import { TracksSection } from "./components/TracksSection";
import { PlaylistsSection } from "./components/PlaylistsSection";
import { ShowsSection } from "./components/ShowsSection";
import { EpisodesSection } from "./components/EpisodesSection";

const filters = {
  all: "All",
  playlists: "Playlists",
  albums: "Albums",
  artists: "Artists",
  tracks: "Songs",
  shows: "Podcasts & Shows",
  episodes: "Episodes",
};

type FilterValue = keyof typeof filters;

type ViewProps = {
  searchText: string;
  setSearchText: (text: string) => void;
  searchFilter: FilterValue;
  setSearchFilter: (filter: FilterValue) => void;
};

function ListDropdown({
  searchFilter,
  setSearchFilter,
}: {
  searchFilter: FilterValue;
  setSearchFilter: (filter: FilterValue) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Filter search"
      value={searchFilter}
      onChange={(newValue) => setSearchFilter(newValue as FilterValue)}
    >
      {Object.entries(filters).map(([value, label]) => (
        <List.Dropdown.Item key={value} title={label} value={value} />
      ))}
    </List.Dropdown>
  );
}

function GridDropdown({
  searchFilter,
  setSearchFilter,
}: {
  searchFilter: FilterValue;
  setSearchFilter: (filter: FilterValue) => void;
}) {
  return (
    <Grid.Dropdown
      tooltip="Filter search"
      value={searchFilter}
      onChange={(newValue) => setSearchFilter(newValue as FilterValue)}
    >
      {Object.entries(filters).map(([value, label]) => (
        <Grid.Dropdown.Item key={value} title={label} value={value} />
      ))}
    </Grid.Dropdown>
  );
}

function AllPreviewView({ searchText, setSearchText, searchFilter, setSearchFilter }: ViewProps) {
  const library = useYourLibrary();

  const { data: playlists, isLoading: isLoadingPlaylists } = usePromise(
    (searchText) => library.searchPlaylists(searchText),
    [searchText],
  );
  const { data: albums, isLoading: isLoadingAlbums } = usePromise(
    (searchText) => library.searchAlbums(searchText),
    [searchText],
  );
  const { data: artists, isLoading: isLoadingArtists } = usePromise(
    (searchText) => library.searchArtists(searchText),
    [searchText],
  );
  const { data: tracks, isLoading: isLoadingTracks } = usePromise(
    (searchText) => library.searchTracks(searchText),
    [searchText],
  );
  const { data: shows, isLoading: isLoadingShows } = usePromise(
    (searchText) => library.searchShows(searchText),
    [searchText],
  );
  const { data: episodes, isLoading: isLoadingEpisodes } = usePromise(
    (searchText) => library.searchEpisodes(searchText),
    [searchText],
  );

  const isLoading =
    isLoadingPlaylists || isLoadingAlbums || isLoadingArtists || isLoadingTracks || isLoadingShows || isLoadingEpisodes;

  return (
    <List
      searchBarPlaceholder="Search your library"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={<ListDropdown searchFilter={searchFilter} setSearchFilter={setSearchFilter} />}
    >
      <PlaylistsSection type="list" limit={searchText ? undefined : 6} playlists={playlists} />
      <AlbumsSection type="list" limit={searchText ? undefined : 6} albums={albums} />
      <ArtistsSection type="list" limit={searchText ? undefined : 6} artists={artists} />
      <TracksSection limit={searchText ? undefined : 6} tracks={tracks} title="Liked Songs" />
      <ShowsSection type="list" limit={searchText ? undefined : 6} shows={shows} />
      <EpisodesSection limit={searchText ? undefined : 6} episodes={episodes} title="Saved Episodes" />
    </List>
  );
}

function TracksView({ searchText, setSearchText, searchFilter, setSearchFilter }: ViewProps) {
  const library = useYourLibrary();
  const {
    data: tracks,
    isLoading,
    pagination,
  } = usePromise((searchText) => library.searchTracks(searchText), [searchText]);

  return (
    <List
      searchBarPlaceholder="Search your songs"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      pagination={pagination}
      searchBarAccessory={<ListDropdown searchFilter={searchFilter} setSearchFilter={setSearchFilter} />}
    >
      <TracksSection tracks={tracks} title="Liked Songs" />
    </List>
  );
}

function EpisodesView({ searchText, setSearchText, searchFilter, setSearchFilter }: ViewProps) {
  const library = useYourLibrary();
  const {
    data: episodes,
    isLoading,
    pagination,
  } = usePromise((searchText) => library.searchEpisodes(searchText), [searchText]);

  return (
    <List
      searchBarPlaceholder="Search your episodes"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      pagination={pagination}
      searchBarAccessory={<ListDropdown searchFilter={searchFilter} setSearchFilter={setSearchFilter} />}
    >
      <EpisodesSection episodes={episodes} title="Saved Episodes" />
    </List>
  );
}

function PlaylistsView({ searchText, setSearchText, searchFilter, setSearchFilter }: ViewProps) {
  const library = useYourLibrary();
  const {
    data: playlists,
    isLoading,
    pagination,
  } = usePromise((searchText) => library.searchPlaylists(searchText), [searchText]);

  return (
    <List
      searchBarPlaceholder="Search your playlists"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      pagination={pagination}
      searchBarAccessory={<ListDropdown searchFilter={searchFilter} setSearchFilter={setSearchFilter} />}
    >
      <PlaylistsSection type="list" playlists={playlists} />
    </List>
  );
}

function ArtistsView({ searchText, setSearchText, searchFilter, setSearchFilter }: ViewProps) {
  const library = useYourLibrary();
  const {
    data: artists,
    isLoading,
    pagination,
  } = usePromise((searchText) => library.searchArtists(searchText), [searchText]);

  return (
    <Grid
      searchBarPlaceholder="Search your artists"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      pagination={pagination}
      searchBarAccessory={<GridDropdown searchFilter={searchFilter} setSearchFilter={setSearchFilter} />}
    >
      <ArtistsSection type="grid" columns={5} artists={artists} />
    </Grid>
  );
}

function AlbumsView({ searchText, setSearchText, searchFilter, setSearchFilter }: ViewProps) {
  const library = useYourLibrary();
  const {
    data: albums,
    isLoading,
    pagination,
  } = usePromise((searchText) => library.searchAlbums(searchText), [searchText]);

  return (
    <Grid
      searchBarPlaceholder="Search your albums"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      pagination={pagination}
      searchBarAccessory={<GridDropdown searchFilter={searchFilter} setSearchFilter={setSearchFilter} />}
    >
      <AlbumsSection type="grid" columns={5} albums={albums} />
    </Grid>
  );
}

function ShowsView({ searchText, setSearchText, searchFilter, setSearchFilter }: ViewProps) {
  const library = useYourLibrary();
  const {
    data: shows,
    isLoading,
    pagination,
  } = usePromise((searchText) => library.searchShows(searchText), [searchText]);

  return (
    <Grid
      searchBarPlaceholder="Search your shows"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      pagination={pagination}
      searchBarAccessory={<GridDropdown searchFilter={searchFilter} setSearchFilter={setSearchFilter} />}
    >
      <ShowsSection type="grid" columns={5} shows={shows} />
    </Grid>
  );
}

function YourLibraryCommand() {
  const [searchFilter, setSearchFilter] = useState<FilterValue>(getPreferenceValues()["Default-View"] ?? "all");
  const [searchText, setSearchText] = useState("");

  const viewProps: ViewProps = {
    searchText,
    setSearchText,
    searchFilter,
    setSearchFilter,
  };

  switch (searchFilter) {
    case "all":
      return <AllPreviewView {...viewProps} />;
    case "tracks":
      return <TracksView {...viewProps} />;
    case "playlists":
      return <PlaylistsView {...viewProps} />;
    case "episodes":
      return <EpisodesView {...viewProps} />;
    case "artists":
      return <ArtistsView {...viewProps} />;
    case "albums":
      return <AlbumsView {...viewProps} />;
    case "shows":
      return <ShowsView {...viewProps} />;
  }
}

export default function Command() {
  return (
    <View>
      <YourLibraryCommand />
    </View>
  );
}
