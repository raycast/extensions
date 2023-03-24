import { Grid } from "@raycast/api";
import { Album, Artist, Playlist, Song, Station } from "./tiles";
import { AppleMusicSearchResults } from "../types";
export default function SearchResults({ results }: { results: AppleMusicSearchResults }) {
  return (
    <>
      {results.songs && (
        <Grid.Section title="Songs" columns={5}>
          {results.songs.data.map((song) => (
            <Song song={song} key={song.id} />
          ))}
        </Grid.Section>
      )}

      {results.albums && (
        <Grid.Section title="Albums" columns={5}>
          {results.albums.data.map((album) => (
            <Album album={album} key={album.id} />
          ))}
        </Grid.Section>
      )}

      {results.playlists && (
        <Grid.Section title="Playlists" columns={5}>
          {results.playlists.data.map((playlist) => (
            <Playlist playlist={playlist} key={playlist.id} />
          ))}
        </Grid.Section>
      )}

      {results.artists && (
        <Grid.Section title="Artists" columns={5}>
          {results.artists.data.map((artist) => (
            <Artist artist={artist} key={artist.id} />
          ))}
        </Grid.Section>
      )}

      {results.stations && (
        <Grid.Section title="Stations" columns={5}>
          {results.stations.data.map((station) => (
            <Station station={station} key={station.id} />
          ))}
        </Grid.Section>
      )}
    </>
  );
}
