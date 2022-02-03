import { List, Icon, ImageMask } from "@raycast/api";

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
  const [title, image, avatar] = [
    item.title || item.description || item.user.name || "No Name",
    item.urls?.thumb || item.urls?.small || item.urls?.regular,
    item.user?.profile_image?.small,
  ];

  const mimicItem: SearchResult = {
    ...item,
    title,
    alt_description: "",
  };

  return (
    <List.Item
      title={title}
      icon={image}
      accessoryTitle={item.user.name}
      accessoryIcon={{ source: avatar || Icon.Person, mask: ImageMask.Circle }}
      actions={<Actions item={mimicItem} details />}
    />
  );
};

export default Unsplash;
