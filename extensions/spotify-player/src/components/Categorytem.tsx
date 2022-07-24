// This whole file is unused

import { List, ActionPanel, Action, Image, Icon, useNavigation } from "@raycast/api";
import CategoryPlaylist from "../categoryPlaylists";

export default function Categoryitem({ category }: { category: SpotifyApi.CategoryObject }) {
  const { push } = useNavigation();

  const imageURL = category.icons[category.icons.length - 1]?.url;
  const icon: Image.ImageLike = {
    source: imageURL ?? Icon.BlankDocument,
    mask: Image.Mask.Circle,
  };

  return (
    <List.Item
      title={category.name}
      icon={icon}
      actions={
        <ActionPanel>
          <Action title={category.name.trim()} onAction={() => push(<CategoryPlaylist category={category} />)} />
        </ActionPanel>
      }
    />
  );
}
