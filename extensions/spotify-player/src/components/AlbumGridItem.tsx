import { Image } from "@raycast/api";
import { AlbumsActionPanel } from "./AlbumsActionPanel";
import { ListOrGridItem } from "./ListOrGridItem";

export default function AlbumGridItem({
  album,
  type,
}: {
  album: SpotifyApi.AlbumObjectSimplified;
  type: "grid" | "list";
}) {
  const icon: Image.ImageLike = {
    source: album.images[0]?.url,
  };

  const title = album.name;
  const subtitle = `${album.artists.map((a) => a.name).join(", ")} • ${album.release_date.substring(
    0,
    4
  )} • ${album.total_tracks.toString()} songs`;

  return (
    <ListOrGridItem
      type={type}
      title={title}
      subtitle={subtitle}
      content={icon}
      icon={icon}
      actions={<AlbumsActionPanel album={album} />}
    />
  );
}
