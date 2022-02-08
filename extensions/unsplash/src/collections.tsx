import { List, Icon, ImageMask } from "@raycast/api";

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
  const [title, description, image, avatar] = [
    searchResult.title || searchResult.description,
    searchResult.description,
    searchResult.cover_photo?.urls?.thumb ||
      searchResult.cover_photo?.urls?.small ||
      searchResult.cover_photo?.urls?.regular,
    searchResult?.user?.profile_image?.small,
  ];

  return (
    <List.Item
      title={title}
      subtitle={description}
      icon={image}
      accessoryTitle={searchResult.user.name}
      accessoryIcon={{ source: avatar || Icon.Person, mask: ImageMask.Circle }}
      actions={<Actions item={searchResult} details />}
    />
  );
};

export default UnsplashCollections;
