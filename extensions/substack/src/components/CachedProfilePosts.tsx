import { useState } from "react";

import { List } from "@raycast/api";

import useCachedPosts from "@/hooks/useCachedPosts";

import CachedPostItem from "@/components/CachedPostItem";

export type CachedProfilePostsProps = {
  handle: string;
};

export default function CachedProfilePosts({ handle }: CachedProfilePostsProps) {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const { data, isLoading } = useCachedPosts(handle);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetails}>
      {data?.map((post) => (
        <CachedPostItem
          key={post._id}
          post={post}
          toggleDetails={() => setShowDetails((s) => !s)}
          detailsShown={showDetails}
        />
      ))}
      <List.EmptyView title={"No posts found"} icon={{ source: "substack.svg" }} />
    </List>
  );
}
