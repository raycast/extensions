import { Image, Icon, Color } from "@raycast/api";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { ListOrGridItem } from "./ListOrGridItem";
import { PlaylistActionPanel } from "./PlaylistActionPanel";

type PlaylistItemProps = {
  type: "grid" | "list";
  playlist: SimplifiedPlaylistObject;
  actions?: React.JSX.Element;
  alreadyAdded?: boolean;
};

export default function PlaylistItem({ type, playlist, actions, alreadyAdded }: PlaylistItemProps) {
  const title = playlist.name as string;
  const subtitle = playlist?.owner?.display_name ?? undefined;
  const imageURL = playlist?.images?.[playlist.images.length - 1]?.url;
  const icon: Image.ImageLike = {
    source: imageURL ?? Icon.BlankDocument,
  };
  actions = actions ?? <PlaylistActionPanel title={title} playlist={playlist} />;

  const accessories = [
    ...(alreadyAdded
      ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Already in playlist" }]
      : []),
    { text: `${playlist?.tracks?.total} songs` },
  ];

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      subtitle={subtitle}
      content={icon}
      accessories={accessories}
      actions={actions}
    />
  );
}
