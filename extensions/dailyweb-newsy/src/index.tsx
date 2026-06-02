import { getPreferenceValues } from "@raycast/api";
import { PostsGridView } from "./posts-grid-view";
import { PostsListView } from "./posts-list-view";
import { usePostsFeed } from "./use-posts-feed";

export default function Command() {
  const { layout } = getPreferenceValues<Preferences>();
  const feed = usePostsFeed();

  if (layout === "grid") {
    return <PostsGridView {...feed} />;
  }

  return <PostsListView {...feed} />;
}
