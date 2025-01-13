import { ComponentProps, memo, useState } from "react";
import { Grid, List, getPreferenceValues, ActionPanel } from "@raycast/api";
import { View } from "./components/View";
import { useYourLibrary } from "./hooks/useYourLibrary";
import { ArtistsSection } from "./components/ArtistsSection";
import { AlbumsSection } from "./components/AlbumsSection";
import { TracksSection } from "./components/TracksSection";
import { PlaylistsSection } from "./components/PlaylistsSection";
import { ShowsSection } from "./components/ShowsSection";
import { EpisodesSection } from "./components/EpisodesSection";
import { RefreshAction } from "./components/RefreshAction";
import { MinimalTrack } from "./api/getMySavedTracks";
import type {
  SimplifiedPlaylistObject,
  SimplifiedAlbumObject,
  ArtistObject,
  SimplifiedShowObject,
  SimplifiedEpisodeObject,
} from "./helpers/spotify.api";

// Constants
const FILTERS = {
  all: "All",
  playlists: "Playlists",
  albums: "Albums",
  artists: "Artists",
  tracks: "Songs",
  shows: "Podcasts & Shows",
  episodes: "Episodes",
} as const;

type FilterValue = keyof typeof FILTERS;

// Types
interface LibraryData {
  playlists?: {
    items?: SimplifiedPlaylistObject[];
  };
  albums?: {
    items: SimplifiedAlbumObject[];
  };
  artists?: {
    items?: ArtistObject[];
  };
  tracks?: {
    items: MinimalTrack[];
    total: number;
    hasMore: boolean;
  };
  shows?: {
    items: SimplifiedShowObject[];
  };
  episodes?: {
    items: SimplifiedEpisodeObject[];
  };
}

type AllSectionsProps = {
  data: LibraryData | undefined;
  searchText: string;
  onRefresh: () => void;
};

// Memoized filter dropdown components
const ListFilterDropdown = memo(
  ({ value, onChange }: { value: FilterValue; onChange: (value: FilterValue) => void }) => (
    <List.Dropdown tooltip="Filter search" value={value} onChange={(newValue) => onChange(newValue as FilterValue)}>
      {Object.entries(FILTERS).map(([value, label]) => (
        <List.Dropdown.Item key={value} title={label} value={value} />
      ))}
    </List.Dropdown>
  ),
);

const GridFilterDropdown = memo(
  ({ value, onChange }: { value: FilterValue; onChange: (value: FilterValue) => void }) => (
    <Grid.Dropdown tooltip="Filter search" value={value} onChange={(newValue) => onChange(newValue as FilterValue)}>
      {Object.entries(FILTERS).map(([value, label]) => (
        <Grid.Dropdown.Item key={value} title={label} value={value} />
      ))}
    </Grid.Dropdown>
  ),
);

// Memoized section components
const AllSections = memo(({ data, searchText, onRefresh }: AllSectionsProps) => (
  <>
    <PlaylistsSection
      type="list"
      limit={searchText ? undefined : 6}
      playlists={data?.playlists?.items}
      tracks={data?.tracks}
      onRefresh={onRefresh}
    />
    <AlbumsSection type="list" limit={searchText ? undefined : 6} albums={data?.albums?.items} onRefresh={onRefresh} />
    <ArtistsSection
      type="list"
      limit={searchText ? undefined : 6}
      artists={data?.artists?.items}
      onRefresh={onRefresh}
    />
    <TracksSection
      limit={searchText ? undefined : 6}
      tracks={data?.tracks?.items}
      title="Liked Songs"
      onRefresh={onRefresh}
    />
    <ShowsSection type="list" limit={searchText ? undefined : 6} shows={data?.shows?.items} onRefresh={onRefresh} />
    <EpisodesSection
      limit={searchText ? undefined : 6}
      episodes={data?.episodes?.items}
      title="Saved Episodes"
      onRefresh={onRefresh}
    />
  </>
));

function YourLibraryCommand() {
  const [searchText, setSearchText] = useState("");
  const [searchFilter, setSearchFilter] = useState<FilterValue>(getPreferenceValues()["Default-View"] ?? "all");
  const { myLibraryData, myLibraryIsLoading, revalidate } = useYourLibrary({
    keepPreviousData: true,
  });

  const sharedProps: ComponentProps<typeof List> = {
    searchBarPlaceholder: "Search your library",
    isLoading: myLibraryIsLoading,
    searchText,
    onSearchTextChange: setSearchText,
    filtering: true,
  };

  const showList =
    searchFilter === "all" || searchFilter === "playlists" || searchFilter === "tracks" || searchFilter === "episodes";

  // Show refresh action when no tracks exist or when searching with no results
  const showRefreshAction =
    !myLibraryIsLoading &&
    (!myLibraryData?.tracks?.items?.length ||
      (searchText &&
        !myLibraryData?.tracks?.items?.some(
          (track) =>
            track.name.toLowerCase().includes(searchText.toLowerCase()) ||
            track.artists.some((artist) => artist.name.toLowerCase().includes(searchText.toLowerCase())),
        )));

  if (showList) {
    return (
      <List
        {...sharedProps}
        searchBarAccessory={<ListFilterDropdown value={searchFilter} onChange={setSearchFilter} />}
        actions={
          showRefreshAction ? (
            <ActionPanel>
              <RefreshAction onRefresh={revalidate} simpleText />
            </ActionPanel>
          ) : undefined
        }
      >
        {!myLibraryIsLoading && (
          <>
            {searchFilter === "all" && (
              <AllSections data={myLibraryData} searchText={searchText} onRefresh={revalidate} />
            )}

            {searchFilter === "tracks" && (
              <TracksSection tracks={myLibraryData?.tracks?.items} title="Liked Songs" onRefresh={revalidate} />
            )}
            {searchFilter === "episodes" && (
              <EpisodesSection
                episodes={myLibraryData?.episodes?.items}
                title="Saved Episodes"
                onRefresh={revalidate}
              />
            )}
            {searchFilter === "playlists" && (
              <PlaylistsSection type="list" playlists={myLibraryData?.playlists?.items} onRefresh={revalidate} />
            )}
          </>
        )}
      </List>
    );
  }

  return (
    <Grid {...sharedProps} searchBarAccessory={<GridFilterDropdown value={searchFilter} onChange={setSearchFilter} />}>
      {searchFilter === "artists" && (
        <ArtistsSection type="grid" columns={5} artists={myLibraryData?.artists?.items} onRefresh={revalidate} />
      )}
      {searchFilter === "albums" && (
        <AlbumsSection type="grid" columns={5} albums={myLibraryData?.albums?.items} onRefresh={revalidate} />
      )}
      {searchFilter === "shows" && (
        <ShowsSection type="grid" columns={5} shows={myLibraryData?.shows?.items} onRefresh={revalidate} />
      )}
    </Grid>
  );
}

export default function Command() {
  return (
    <View>
      <YourLibraryCommand />
    </View>
  );
}
