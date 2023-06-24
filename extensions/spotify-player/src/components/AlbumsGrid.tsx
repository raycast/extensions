import { Grid } from "@raycast/api";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { AlbumItem } from "./AlbumItem";

type AlbumsGridProps = {
  albums: SimplifiedAlbumObject[];
  title?: string;
};

export function AlbumsGrid({ albums, title }: AlbumsGridProps) {
  return (
    <Grid searchBarPlaceholder="Search albums">
      <Grid.Section title={title}>
        {albums
          .sort((album) => Date.parse(album.release_date))
          .map((album) => (
            <AlbumItem type="grid" key={album.id} album={album} />
          ))}
      </Grid.Section>
    </Grid>
  );
}
