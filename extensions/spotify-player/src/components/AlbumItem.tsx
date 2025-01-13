import { Image, Icon } from "@raycast/api";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { ListOrGridItem } from "./ListOrGridItem";
import { AlbumActionPanel } from "./AlbumActionPanel";

type AlbumItemProps = {
  type: "grid" | "list";
  album: SimplifiedAlbumObject;
  onRefresh?: () => void;
};

export function AlbumItem({ type, album, onRefresh }: AlbumItemProps) {
  const title = album.name || "Untitled Album";
  const subtitle = album.artists?.map((a) => a.name).join(", ");
  const icon: Image.ImageLike = album.images?.[0]?.url
    ? {
        source: album.images[0].url,
      }
    : { source: Icon.Music };

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      subtitle={subtitle}
      content={icon}
      accessories={[{ text: `${album.total_tracks} tracks` }]}
      actions={<AlbumActionPanel album={album} onRefresh={onRefresh} />}
    />
  );
}
