import { Grid, showToast, Toast } from "@raycast/api";
import { useGetCategories } from "./spotify/client";
import CategoryItem from "./components/CategoryItem";
import { SpotifyProvider } from "./utils/context";

function BrowseAll() {
  const response = useGetCategories();

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <Grid searchBarPlaceholder="Search genres..." isLoading={response.isLoading} throttle>
      {response.result?.categories.items.map((c) => (
        <CategoryItem key={c.id} category={c} />
      ))}
    </Grid>
  );
}

export default () => (
  <SpotifyProvider>
    <BrowseAll />
  </SpotifyProvider>
);
