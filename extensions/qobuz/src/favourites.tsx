import { Grid, Icon } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { FavouriteType } from "@kud/qobuz";
import { BRAND, getClient } from "./lib/client";
import { AlbumItemActions, ArtistItemActions, TrackItemActions } from "./lib/details";

export default function Command() {
  const [type, setType] = useState<FavouriteType>("albums");

  const { data, isLoading } = useCachedPromise(
    async (favouriteType: FavouriteType) => {
      const client = await getClient();
      return client.favourites.list(favouriteType);
    },
    [type],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Couldn't load favourites" });
      },
    },
  );

  return (
    <Grid
      columns={5}
      aspectRatio="1"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      searchBarPlaceholder="Filter favourites…"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Favourite type" value={type} onChange={(value) => setType(value as FavouriteType)}>
          <Grid.Dropdown.Item title="Albums" value="albums" />
          <Grid.Dropdown.Item title="Artists" value="artists" />
          <Grid.Dropdown.Item title="Tracks" value="tracks" />
        </Grid.Dropdown>
      }
    >
      {type === "albums" &&
        (data?.albums ?? []).map((album) => (
          <Grid.Item
            key={`album-${album.id}`}
            content={album.image?.large ?? album.image?.small ?? { source: Icon.Music, tintColor: BRAND }}
            title={album.title}
            subtitle={album.artist?.name ?? ""}
            actions={<AlbumItemActions album={album} />}
          />
        ))}

      {type === "artists" &&
        (data?.artists ?? []).map((artist) => (
          <Grid.Item
            key={`artist-${artist.id}`}
            content={artist.picture ?? { source: Icon.Person, tintColor: BRAND }}
            title={artist.name}
            actions={<ArtistItemActions artist={artist} />}
          />
        ))}

      {type === "tracks" &&
        (data?.tracks ?? []).map((track) => (
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
    </Grid>
  );
}
