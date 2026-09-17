import { Grid, Icon } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { BRAND, getClient } from "./lib/client";
import { AlbumItemActions, ArtistItemActions, TrackItemActions } from "./lib/details";

const EMPTY = { query: "", albums: [], artists: [], tracks: [] };

type Filter = "all" | "albums" | "artists" | "tracks";

export default function Command() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading } = useCachedPromise(
    async (term: string) => {
      if (!term.trim()) return EMPTY;
      const client = await getClient();
      return client.search.search(term, { limit: 20 });
    },
    [query],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Qobuz search failed" });
      },
    },
  );

  const results = data ?? EMPTY;
  const show = (type: Filter) => filter === "all" || filter === type;

  return (
    <Grid
      columns={5}
      aspectRatio="1"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Qobuz for albums, artists, tracks…"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter results" value={filter} onChange={(value) => setFilter(value as Filter)}>
          <Grid.Dropdown.Item title="All" value="all" />
          <Grid.Dropdown.Item title="Albums" value="albums" />
          <Grid.Dropdown.Item title="Artists" value="artists" />
          <Grid.Dropdown.Item title="Tracks" value="tracks" />
        </Grid.Dropdown>
      }
      throttle
    >
      {show("albums") && (
        <Grid.Section title="Albums" subtitle={`${results.albums.length}`}>
          {results.albums.map((album) => (
            <Grid.Item
              key={`album-${album.id}`}
              content={album.image?.large ?? album.image?.small ?? { source: Icon.Music, tintColor: BRAND }}
              title={album.title}
              subtitle={album.artist?.name ?? ""}
              actions={<AlbumItemActions album={album} />}
            />
          ))}
        </Grid.Section>
      )}

      {show("artists") && (
        <Grid.Section title="Artists" subtitle={`${results.artists.length}`}>
          {results.artists.map((artist) => (
            <Grid.Item
              key={`artist-${artist.id}`}
              content={artist.picture ?? { source: Icon.Person, tintColor: BRAND }}
              title={artist.name}
              actions={<ArtistItemActions artist={artist} />}
            />
          ))}
        </Grid.Section>
      )}

      {show("tracks") && (
        <Grid.Section title="Tracks" subtitle={`${results.tracks.length}`}>
          {results.tracks.map((track) => (
            <Grid.Item
              key={`track-${track.id}`}
              content={
                track.album?.image?.large ??
                track.album?.image?.small ?? {
                  source: Icon.Music,
                  tintColor: BRAND,
                }
              }
              title={track.title}
              subtitle={track.album?.title ?? track.artist?.name ?? ""}
              actions={<TrackItemActions track={track} />}
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
