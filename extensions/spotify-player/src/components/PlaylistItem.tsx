import { Image, Icon } from "@raycast/api";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { ListOrGridItem } from "./ListOrGridItem";
import { PlaylistActionPanel } from "./PlaylistActionPanel";

type PlaylistItemProps = {
  type: "grid" | "list";
  playlist: SimplifiedPlaylistObject;
  onRefresh?: () => void;
};

export default function PlaylistItem({ type, playlist, onRefresh }: PlaylistItemProps) {
  const title = playlist.name || "Untitled Playlist";
  const icon: Image.ImageLike = playlist.images?.[0]?.url
    ? {
        source: playlist.images[0].url,
      }
    : { source: Icon.Music };

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      content={icon}
      accessories={[{ text: `${playlist.tracks?.total || 0} tracks` }]}
      actions={<PlaylistActionPanel title={title} playlist={playlist} onRefresh={onRefresh} />}
    />
  );
}
