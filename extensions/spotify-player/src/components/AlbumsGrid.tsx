import { Grid } from "@raycast/api";
import { AlbumItem } from "./AlbumItem";

type AlbumsGridProps = {
  albums: SpotifyApi.AlbumObjectSimplified[];
};

export function AlbumsGrid({ albums }: AlbumsGridProps) {
  return (
    <Grid searchBarPlaceholder="Search albums">
      {albums
        .sort((album) => Date.parse(album.release_date))
        .map((album: SpotifyApi.AlbumObjectSimplified) => (
          <AlbumItem type="grid" key={album.id} album={album} />
        ))}
    </Grid>
  );
}
