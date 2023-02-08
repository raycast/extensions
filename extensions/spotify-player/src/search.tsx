import { Grid, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useSearch } from "./spotify/client";
import AlbumGridItem from "./components/AlbumGridItem";
import { SpotifyProvider } from "./utils/context";
import ArtistGridItem from "./components/ArtistItem";
import TrackListItem from "./components/TrackListItem";
import PlaylistItem from "./components/PlaylistItem";
import { ListOrGridSection } from "./components/ListOrGridSection";

const filters = {
  all: "All",
  albums: "Albums",
  artists: "Artists",
  tracks: "Songs",
  playlists: "Playlists",
};

type FilterValue = keyof typeof filters;

function Search() {
  const [searchText, setSearchText] = useState<string>();
  const [searchFilter, setSearchFilter] = useState<FilterValue>("all");
  const response = useSearch(searchText, 32);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  const sharedProps = {
    searchBarPlaceholder: "What do you want to listen to",
    onSearchTextChange: setSearchText,
    isLoading: response.isLoading,
    throttle: true,
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
            <ArtistsSection type="list" limit={3} columns={6} artists={response.result?.artists?.items} />
            <AlbumsSection type="list" limit={3} columns={8} albums={response.result?.albums?.items} />
            <TracksSection limit={6} tracks={response.result?.tracks?.items} />
            <PlaylistsSection type="list" columns={8} limit={6} playlists={response.result?.playlists?.items} />
          </>
        )}

        {searchFilter === "tracks" && <TracksSection tracks={response.result?.tracks?.items} />}
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
      {searchFilter === "artists" && (
        <ArtistsSection type="grid" columns={6} artists={response.result?.artists?.items} />
      )}

      {searchFilter === "albums" && <AlbumsSection type="grid" columns={6} albums={response.result?.albums?.items} />}

      {searchFilter === "playlists" && (
        <PlaylistsSection type="grid" columns={6} playlists={response.result?.playlists?.items} />
      )}
    </Grid>
  );
}

function ArtistsSection({
  type,
  artists,
  columns,
  limit,
}: {
  type: "list" | "grid";
  limit?: number;
  columns: number;
  artists: SpotifyApi.ArtistObjectFull[] | undefined;
}) {
  if (!artists) return null;

  const items = artists.slice(0, limit || artists.length);

  return (
    <ListOrGridSection type={type} title="Artists" columns={columns}>
      {items.map((a) => (
        <ArtistGridItem type={type} key={a.id} artist={a} />
      ))}
    </ListOrGridSection>
  );
}

function AlbumsSection({
  type,
  albums,
  columns,
  limit,
}: {
  type: "list" | "grid";
  limit?: number;
  columns: number;
  albums: SpotifyApi.AlbumObjectSimplified[] | undefined;
}) {
  if (!albums) return null;

  const items = albums.slice(0, limit || albums.length);

  return (
    <ListOrGridSection type={type} title="Albums" columns={columns}>
      {items.map((a) => (
        <AlbumGridItem type={type} key={a.id} album={a} />
      ))}
    </ListOrGridSection>
  );
}

function TracksSection({ tracks, limit }: { tracks: SpotifyApi.TrackObjectFull[] | undefined; limit?: number }) {
  if (!tracks) return null;

  const items = tracks.slice(0, limit || tracks.length);

  return (
    <List.Section title="Songs">
      {items?.map((a) => (
        <TrackListItem key={a.id} track={a} album={a.album} />
      ))}
    </List.Section>
  );
}

function PlaylistsSection({
  playlists,
  type,
  columns,
  limit,
}: {
  playlists: SpotifyApi.PlaylistObjectSimplified[] | undefined;
  type: "list" | "grid";
  columns: number;
  limit?: number;
}) {
  if (!playlists) return null;

  const items = playlists.slice(0, limit || playlists.length);

  return (
    <ListOrGridSection type={type} title="Playlists" columns={columns}>
      {items.map((a) => (
        <PlaylistItem key={a.id} playlist={a} type={type} />
      ))}
    </ListOrGridSection>
  );
}

export default () => (
  <SpotifyProvider>
    <Search />
  </SpotifyProvider>
);
