import { Grid } from "@raycast/api";

// Hooks
import { useSearch } from "./hooks/useSearch";

// Components
import Actions from "./components/Actions";

// Types
interface SearchListItemProps {
  searchResult: SearchResult;
}

const Unsplash: React.FC = () => {
  const { state, search } = useSearch("photos");

  return (
    <Grid isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search wallpapers..." throttle>
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

  return (
    <Grid.Item title={title} content={image} subtitle={description} actions={<Actions item={searchResult} details />} />
  );
};

export default Unsplash;
