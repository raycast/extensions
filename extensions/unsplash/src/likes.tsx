import { getGridItemSize, showImageTitle, toTitleCase } from "@/functions/utils";
import { useMemo, useState } from "react";
import { Grid } from "@raycast/api";

// Hooks
import { useLikes } from "@/hooks/useLikes";

// Components
import Actions from "@/components/Actions";
import { LikesResult, SearchResult } from "@/types";

// Types
interface SearchListItemProps {
  item: LikesResult;
  unlike: React.Dispatch<React.SetStateAction<string[]>>;
}

const UnsplashLikes = () => {
  const { loading, likes } = useLikes();
  const itemSize = getGridItemSize();
  const [unliked, setUnliked] = useState<string[]>([]);

  const filteredLikes = useMemo(() => {
    return likes?.filter((like) => !unliked.includes(String(like.id))) || [];
  }, [unliked, likes]);

  return (
    <Grid isLoading={loading} itemSize={itemSize} searchBarPlaceholder="Search your likes...">
      <Grid.EmptyView icon="empty-states-photos.png" />
      <Grid.Section title="Results" subtitle={String(filteredLikes?.length)}>
        {filteredLikes?.map((like) => (
          <SearchListItem key={like.id} item={like} unlike={setUnliked} />
        ))}
      </Grid.Section>
    </Grid>
  );
};

const SearchListItem = ({ item, unlike }: SearchListItemProps) => {
  const [title, image] = [
    item.title || item.description || item.user.name || "No Name",
    item.urls?.thumb || item.urls?.small || item.urls?.regular,
  ];

  const mimicItem: SearchResult = {
    ...item,
    title,
    alt_description: "",
  };

  const gridItemTitle = showImageTitle() ? toTitleCase(title) : "";

  return (
    <Grid.Item content={image} title={gridItemTitle} actions={<Actions item={mimicItem} unlike={unlike} details />} />
  );
};

export default UnsplashLikes;
