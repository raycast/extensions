import { List } from "@raycast/api";
import AlbumItem from "./AlbumListItem";
import ArtistListItem from "./ArtistListItem";
import PlaylistItem from "./PlaylistListItem";
import TrackListItem from "./TrackListItem";

export function SearchListItems({
  results,
  spotifyInstalled,
}: {
  results: SpotifyApi.SearchResponse;
  spotifyInstalled: boolean;
}) {
  return (
    <>
      <List.Section key="artists" title="Artists">
        {results.artists?.items.map((i) => (
          <ArtistListItem key={i.id} artist={i} />
        ))}
      </List.Section>
      <List.Section key="tracks" title="Tracks">
        {results.tracks?.items.map((i) => (
          <TrackListItem key={i.id} track={i} spotifyInstalled={spotifyInstalled} />
        ))}
      </List.Section>
      <List.Section key="albums" title="Albums">
        {results.albums?.items.map((a) => (
          <AlbumItem key={a.id} album={a} spotifyInstalled={spotifyInstalled} />
        ))}
      </List.Section>
      <List.Section key="playlists" title="Playlists">
        {results.playlists?.items.map((i) => (
          <PlaylistItem key={i.id} playlist={i} spotifyInstalled={spotifyInstalled} />
        ))}
      </List.Section>
    </>
  );
}
