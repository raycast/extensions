import { Grid } from "@raycast/api";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { AlbumItem } from "./AlbumItem";

type AlbumsGridProps = {
  albums: SimplifiedAlbumObject[];
};

export function AlbumsGrid({ albums }: AlbumsGridProps) {
  return (
    <Grid searchBarPlaceholder="Search albums">
      {albums
        .sort((album) => Date.parse(album.release_date))
        .map((album) => (
          <AlbumItem type="grid" key={album.id} album={album} />
        ))}
    </Grid>
  );
}
