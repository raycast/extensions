import { useState } from "react";
import { List, Icon } from "@raycast/api";
import { View } from "./components/View";
import { useSearch } from "./hooks/useSearch";
import TrackListItem from "./components/TrackListItem";

type FilterValue = "all" | "artists" | "tracks" | "albums" | "playlists";

const filters: Record<FilterValue, string> = {
  all: "All",
  artists: "Artists",
  tracks: "Songs",
  albums: "Albums",
  playlists: "Playlists",
};

function SearchCommand() {
  const [searchText, setSearchText] = useState("");
  const [searchFilter, setSearchFilter] = useState<FilterValue>("all");

  const { searchData, searchIsLoading } = useSearch({
    query: searchText,
    options: { keepPreviousData: true },
  });

  const showAll = searchFilter === "all";

  return (
    <List
      searchBarPlaceholder="Search for songs, artists, albums, or playlists..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={searchIsLoading}
      throttle
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
      {!searchText ? (
        <List.EmptyView title="What do you want to listen to?" icon={Icon.Music} />
      ) : (
        <>
          {/* Artists Section */}
          {(showAll || searchFilter === "artists") &&
            searchData?.artists?.items &&
            searchData.artists.items.length > 0 && (
              <List.Section
                title="Artists"
                subtitle={showAll ? `${Math.min(3, searchData.artists.items.length)}` : undefined}
              >
                {searchData.artists.items
                  .slice(0, showAll ? 3 : undefined)
                  .filter(Boolean)
                  .map((artist) => {
                    if (!artist) return null;
                    return (
                      <List.Item
                        key={artist.id}
                        title={artist.name || "Unknown Artist"}
                        subtitle={`${artist.followers?.total?.toLocaleString() || 0} followers`}
                        icon={{ source: artist.images?.[0]?.url || Icon.Person }}
                        accessories={[{ text: `${artist.popularity}%`, tooltip: "Popularity" }]}
                      />
                    );
                  })}
              </List.Section>
            )}

          {/* Tracks Section */}
          {(showAll || searchFilter === "tracks") &&
            searchData?.tracks?.items &&
            searchData.tracks.items.length > 0 && (
              <List.Section
                title="Songs"
                subtitle={showAll ? `${Math.min(4, searchData.tracks.items.length)}` : undefined}
              >
                {searchData.tracks.items
                  .slice(0, showAll ? 4 : undefined)
                  .filter(Boolean)
                  .map((track) => {
                    if (!track) return null;
                    return <TrackListItem key={track.id} track={track} album={track.album} />;
                  })}
              </List.Section>
            )}

          {/* Albums Section */}
          {(showAll || searchFilter === "albums") &&
            searchData?.albums?.items &&
            searchData.albums.items.length > 0 && (
              <List.Section
                title="Albums"
                subtitle={showAll ? `${Math.min(3, searchData.albums.items.length)}` : undefined}
              >
                {searchData.albums.items
                  .slice(0, showAll ? 3 : undefined)
                  .filter(Boolean)
                  .map((album) => {
                    if (!album) return null;
                    return (
                      <List.Item
                        key={album.id}
                        title={album.name || "Unknown Album"}
                        subtitle={album.artists?.map((a) => a.name).join(", ") || "Unknown Artist"}
                        icon={{ source: album.images?.[0]?.url || Icon.Cd }}
                        accessories={[
                          { text: album.release_date || "" },
                          { text: `${album.total_tracks} tracks`, tooltip: "Total Tracks" },
                        ]}
                      />
                    );
                  })}
              </List.Section>
            )}

          {/* Playlists Section */}
          {(showAll || searchFilter === "playlists") &&
            searchData?.playlists?.items &&
            searchData.playlists.items.length > 0 && (
              <List.Section
                title="Playlists"
                subtitle={showAll ? `${Math.min(3, searchData.playlists.items.length)}` : undefined}
              >
                {searchData.playlists.items
                  .slice(0, showAll ? 3 : undefined)
                  .filter(Boolean)
                  .map((playlist) => {
                    if (!playlist) return null;
                    return (
                      <List.Item
                        key={playlist.id}
                        title={playlist.name || "Unknown Playlist"}
                        subtitle={`by ${playlist.owner?.display_name || "Unknown"}`}
                        icon={{ source: playlist.images?.[0]?.url || Icon.List }}
                        accessories={[{ text: `${playlist.tracks?.total || 0} tracks`, tooltip: "Total Tracks" }]}
                      />
                    );
                  })}
              </List.Section>
            )}

          {searchText &&
            !searchIsLoading &&
            !searchData?.tracks?.items?.length &&
            !searchData?.artists?.items?.length &&
            !searchData?.albums?.items?.length &&
            !searchData?.playlists?.items?.length && (
              <List.EmptyView
                title="No results found"
                description={`Try searching for something else`}
                icon={Icon.MagnifyingGlass}
              />
            )}
        </>
      )}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <SearchCommand />
    </View>
  );
}
