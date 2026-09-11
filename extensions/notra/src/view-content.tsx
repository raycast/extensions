import { List } from "@raycast/api";
import { useState } from "react";
import { ContentTypeDropdown } from "./components/content-type-dropdown";
import { PostListItem } from "./components/post-list-item";
import { usePosts } from "./hooks/use-posts";
import type { ContentTypeFilter } from "./types";

export default function Command() {
  const [contentType, setContentType] = useState<ContentTypeFilter>("all");
  const { data: posts, isLoading, pagination, revalidate } = usePosts(contentType);

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={<ContentTypeDropdown onChange={setContentType} />}
      searchBarPlaceholder="Search posts..."
    >
      <List.EmptyView description="Try changing the content type filter." title="No Posts Found" />
      {posts?.map((post) => (
        <PostListItem key={post.id} onPostMutated={revalidate} post={post} />
      ))}
    </List>
  );
}
