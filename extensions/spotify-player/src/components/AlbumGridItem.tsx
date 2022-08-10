import { Grid, Image } from "@raycast/api";
import { AlbumsActionPanel } from "./AlbumsActionPanel";

export default function AlbumGridItem(props: { album: SpotifyApi.AlbumObjectSimplified; spotifyInstalled: boolean }) {
  const { album, spotifyInstalled } = props;
  const icon: Image.ImageLike = {
    source: album.images[0]?.url,
  };

  const title = album.name;
  const subtitle = `${album.artists.map((a) => a.name).join(", ")} • ${album.release_date.substring(
    0,
    4
  )} • ${album.total_tracks.toString()} songs`;
  return (
    <Grid.Item
      title={title}
      subtitle={subtitle}
      content={icon}
      actions={<AlbumsActionPanel album={album} spotifyInstalled={spotifyInstalled} />}
    />
  );
}
