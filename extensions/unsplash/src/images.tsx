import { Grid } from "@raycast/api";
import { getGridItemSize, showImageTitle, toTitleCase } from "./functions/utils";

// Hooks
import { useSearch } from "./hooks/useSearch";

// Components
import Actions from "./components/Actions";
import { useEffect } from "react";

// Types
interface SearchListItemProps {
  searchResult: SearchResult;
}

const Unsplash: React.FC = () => {
  const { state, search } = useSearch("photos");
  const itemSize = getGridItemSize();

  return (
    <Grid
      isLoading={state.isLoading}
      itemSize={itemSize}
      onSearchTextChange={search}
      searchBarPlaceholder="Search wallpapers..."
      throttle
    >
      <Grid.Section title="Results" subtitle={String(state?.results?.length)}>
        {state.results.map((result) => (
          <SearchListItem key={result.id} searchResult={result} />
        ))}
      </Grid.Section>
    </Grid>
  );
};

const SearchListItem: React.FC<SearchListItemProps> = ({ searchResult }) => {
  const [title, description, image, avatar] = [
    searchResult.description || searchResult.alt_description || searchResult.user.name || "No Name",
    searchResult.description ? searchResult.alt_description : undefined,
    searchResult.urls?.thumb || searchResult.urls?.small || searchResult.urls?.regular,
    searchResult?.user?.profile_image?.small,
  ];

  const gridItemTitle = showImageTitle() ? toTitleCase(title) : "";

  return <Grid.Item content={image} title={gridItemTitle} actions={<Actions item={searchResult} details />} />;
};

export default Unsplash;
