import { Grid } from "@raycast/api";
import { getGridItemSize, showImageTitle, toTitleCase } from "./functions/utils";

// Hooks
import { useSearch } from "./hooks/useSearch";

// Components
import Actions from "./components/ActionsCollection";

// Types
interface CollectionListItemProps {
  searchResult: CollectionResult;
}

const UnsplashCollections: React.FC = () => {
  const { state, search } = useSearch("collections");
  const itemSize = getGridItemSize();

  return (
    <Grid
      isLoading={state.isLoading}
      itemSize={itemSize}
      onSearchTextChange={search}
      searchBarPlaceholder="Search collections..."
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

const SearchListItem: React.FC<CollectionListItemProps> = ({ searchResult }) => {
  const [title, description, image, avatar] = [
    searchResult.title || searchResult.description,
    searchResult.description,
    searchResult.cover_photo?.urls?.thumb ||
      searchResult.cover_photo?.urls?.small ||
      searchResult.cover_photo?.urls?.regular,
    searchResult?.user?.profile_image?.small,
  ];

  const gridItemTitle = showImageTitle() ? toTitleCase(title) : "";

  return <Grid.Item content={image} title={gridItemTitle} actions={<Actions item={searchResult} details />} />;
};

export default UnsplashCollections;
