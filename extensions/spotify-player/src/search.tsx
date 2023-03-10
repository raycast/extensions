import { Grid, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import View from "./components/View";
import useSearch from "./hooks/useSearch";
import { ArtistsSection } from "./components/ArtistsSection";
import { AlbumsSection } from "./components/AlbumsSection";
import { TracksSection } from "./components/TracksSection";
import { PlaylistsSection } from "./components/PlaylistsSection";

const filters = {
  all: "All",
  artists: "Artists",
  albums: "Albums",
  tracks: "Songs",
  playlists: "Playlists",
};

type FilterValue = keyof typeof filters;

function SearchCommand() {
  const [searchText, setSearchText] = useState("");
  const [searchFilter, setSearchFilter] = useState<FilterValue>("all");
  const { searchData, searchError, searchIsLoading } = useSearch({
    query: searchText,
    limit: 32,
    options: { keepPreviousData: true },
  });

  if (searchError) {
    showToast(Toast.Style.Failure, "Search has failed", searchError.message);
  }

  const sharedProps = {
    searchBarPlaceholder: "What do you want to listen to",
    onSearchTextChange: setSearchText,
    isLoading: searchIsLoading,
    throttle: true,
    searchText,
  };

  if (searchFilter === "all" || searchFilter === "tracks") {
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
            <ArtistsSection type="list" limit={3} columns={6} artists={searchData?.artists?.items} />
            <AlbumsSection type="list" limit={3} columns={8} albums={searchData?.albums?.items} />
            <TracksSection limit={6} tracks={searchData?.tracks?.items} />
            <PlaylistsSection type="list" columns={8} limit={6} playlists={searchData?.playlists?.items} />
          </>
        )}

        {searchFilter === "tracks" && <TracksSection tracks={searchData?.tracks?.items} />}
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
      {searchFilter === "artists" && <ArtistsSection type="grid" columns={6} artists={searchData?.artists?.items} />}

      {searchFilter === "albums" && <AlbumsSection type="grid" columns={6} albums={searchData?.albums?.items} />}

      {searchFilter === "playlists" && (
        <PlaylistsSection type="grid" columns={6} playlists={searchData?.playlists?.items} />
      )}
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
