import { Image } from "@raycast/api";
import { AlbumActionPanel } from "./AlbumActionPanel";
import { ListOrGridItem } from "./ListOrGridItem";

type AlbumItemProps = { type: "grid" | "list"; album: SpotifyApi.AlbumObjectSimplified };

export function AlbumItem({ type, album }: AlbumItemProps) {
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
      icon={icon}
      title={title}
      subtitle={subtitle}
      content={icon}
      actions={<AlbumActionPanel album={album} />}
    />
  );
}
