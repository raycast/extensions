import { List, showToast, Toast } from "@raycast/api";
import { useGetCategoryPlaylists } from "./spotify/client";
import PlaylistItem from "./components/PlaylistListItem";
import { SpotifyProvider } from "./utils/context";

type Props = { category: SpotifyApi.CategoryObject };

function CategoryPlaylists({ category }: Props) {
  const response = useGetCategoryPlaylists(category.id);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <List
      searchBarPlaceholder="Search playlists..."
      navigationTitle={category.name}
      isLoading={response.isLoading}
      throttle
      enableFiltering
    >
      {response.result?.playlists.items.map((p) => (
        <PlaylistItem key={p.id} playlist={p} />
      ))}
    </List>
  );
}

export default (props: Props) => (
  <SpotifyProvider>
    <CategoryPlaylists {...props} />
  </SpotifyProvider>
);
