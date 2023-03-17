import { Grid, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import View from "./components/View";
import { useMyLibrary } from "./hooks/useMyLibrary";
import { ArtistsSection } from "./components/ArtistsSection";
import { AlbumsSection } from "./components/AlbumsSection";
import { TracksSection } from "./components/TracksSection";
import { PlaylistsSection } from "./components/PlaylistsSection";

const filters = {
  all: "All",
  playlists: "Playlists",
  albums: "Albums",
  artists: "Artists",
  tracks: "Songs",
};

type FilterValue = keyof typeof filters;

function MyLibraryCommand() {
  const [searchText, setSearchText] = useState("");
  const [searchFilter, setSearchFilter] = useState<FilterValue>("all");
  const { myLibraryData, myLibraryError, myLibraryIsLoading } = useMyLibrary({
    options: { keepPreviousData: true },
  });

  if (myLibraryError) {
    showToast(Toast.Style.Failure, "Search has failed", myLibraryError.message);
  }

  const sharedProps = {
    searchBarPlaceholder: "What do you want to listen to",
    onSearchTextChange: setSearchText,
    isLoading: myLibraryIsLoading,
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
            <PlaylistsSection type="list" limit={6} columns={8} playlists={myLibraryData?.playlists?.items} />
            <AlbumsSection type="list" limit={6} columns={8} albums={myLibraryData?.albums?.items} />
            <ArtistsSection type="list" limit={6} columns={6} artists={myLibraryData?.artists?.items} />
            <TracksSection limit={6} tracks={myLibraryData?.tracks?.items} />
          </>
        )}

        {searchFilter === "tracks" && <TracksSection tracks={myLibraryData?.tracks?.items} />}
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
      {searchFilter === "artists" && <ArtistsSection type="grid" columns={6} artists={myLibraryData?.artists?.items} />}

      {searchFilter === "albums" && <AlbumsSection type="grid" columns={6} albums={myLibraryData?.albums?.items} />}

      {searchFilter === "playlists" && (
        <PlaylistsSection type="grid" columns={6} playlists={myLibraryData?.playlists?.items} />
      )}
    </Grid>
  );
}

export default function Command() {
  return (
    <View>
      <MyLibraryCommand />
    </View>
  );
}
