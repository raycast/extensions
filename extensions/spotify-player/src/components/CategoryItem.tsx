import { ActionPanel, Action, Image, Icon, useNavigation, Grid } from "@raycast/api";
import CategoryPlaylist from "../categoryPlaylists";

export default function CategoryItem({ category }: { category: SpotifyApi.CategoryObject }) {
  const { push } = useNavigation();

  const imageURL = category.icons[category.icons.length - 1]?.url;
  const icon: Image.ImageLike = {
    source: imageURL,
    fallback: Icon.BlankDocument,
  };

  return (
    <Grid.Item
      title={category.name}
      content={icon}
      actions={
        <ActionPanel>
          <Action
            title={`Open ${category.name.trim()}`}
            icon={Icon.ArrowRight}
            onAction={() => push(<CategoryPlaylist category={category} />)}
          />
        </ActionPanel>
      }
    />
  );
}
