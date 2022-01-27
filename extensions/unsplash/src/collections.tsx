import { List, Icon } from "@raycast/api";

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

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search collections..." throttle>
      <List.Section title="Results" subtitle={String(state?.results?.length)}>
        {state.results.map((result) => (
          <SearchListItem key={result.id} searchResult={result} />
        ))}
      </List.Section>
    </List>
  );
};

const SearchListItem: React.FC<CollectionListItemProps> = ({ searchResult }) => {
  const [title, description, image] = [
    searchResult.title || searchResult.description,
    searchResult.description,
    searchResult.cover_photo?.urls?.thumb ||
      searchResult.cover_photo?.urls?.small ||
      searchResult.cover_photo?.urls?.regular,
  ];

  return (
    <List.Item
      title={title}
      subtitle={description}
      icon={image}
      accessoryTitle={searchResult.user.name}
      accessoryIcon={Icon.Person}
      actions={<Actions item={searchResult} details />}
    />
  );
};

export default UnsplashCollections;
