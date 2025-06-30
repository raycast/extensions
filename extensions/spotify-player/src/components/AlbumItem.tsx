import { Icon, Image } from "@raycast/api";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { AlbumActionPanel } from "./AlbumActionPanel";
import { ListOrGridItem } from "./ListOrGridItem";

type AlbumItemProps = { type: "grid" | "list"; album: SimplifiedAlbumObject };

export function AlbumItem({ type, album }: AlbumItemProps) {
  const icon: Image.ImageLike = {
    source: album.images[0]?.url ?? Icon.Dot,
  };

  const title = album.name;
  const subtitle = `${album.artists.map((a) => a.name).join(", ")} · ${album.release_date.substring(0, 4)}`;

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      subtitle={subtitle}
      accessories={[{ text: `${album.total_tracks} songs` }]}
      content={icon}
      actions={<AlbumActionPanel album={album} />}
    />
  );
}
