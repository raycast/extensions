import { Image, Icon } from "@raycast/api";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { ListOrGridItem } from "./ListOrGridItem";
import { PlaylistActionPanel } from "./PlaylistActionPanel";

type PlaylistItemProps = {
  type: "grid" | "list";
  playlist: SimplifiedPlaylistObject;
  actions?: React.JSX.Element;
};

export default function PlaylistItem({ type, playlist, actions }: PlaylistItemProps) {
  const title = playlist.name as string;
  const subtitle = playlist?.owner?.display_name ?? undefined;
  const imageURL = playlist?.images?.[playlist.images.length - 1]?.url;
  const icon: Image.ImageLike = {
    source: imageURL ?? Icon.BlankDocument,
  };
  actions = actions ?? <PlaylistActionPanel title={title} playlist={playlist} />;

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      subtitle={subtitle}
      content={icon}
      accessories={[{ text: `${playlist?.tracks?.total} songs` }]}
      actions={actions}
    />
  );
}
