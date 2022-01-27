import { List, Icon } from "@raycast/api";

// Hooks
import { useLikes } from "./hooks/useLikes";

// Components
import Actions from "./components/Actions";

// Types
interface SearchListItemProps {
  item: LikesResult;
}

const Unsplash: React.FC = () => {
  const { loading, likes } = useLikes();

  return (
    <List isLoading={loading} searchBarPlaceholder="Search your likes...">
      <List.Section title="Results" subtitle={String(likes?.length)}>
        {likes?.map((like) => (
          <SearchListItem key={like.id} item={like} />
        ))}
      </List.Section>
    </List>
  );
};

const SearchListItem: React.FC<SearchListItemProps> = ({ item }) => {
  const [title, image] = [
    item.description || item.user.name || "No Name",
    item.urls?.thumb || item.urls?.small || item.urls?.regular,
  ];

  const mimicItem: SearchResult = {
    title,
    alt_description: "",
    ...item,
  };

  return (
    <List.Item
      title={title}
      icon={image}
      accessoryTitle={item.user.name}
      accessoryIcon={Icon.Person}
      actions={<Actions item={mimicItem} details />}
    />
  );
};

export default Unsplash;
