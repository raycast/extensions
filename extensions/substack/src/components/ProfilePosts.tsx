import { useState } from "react";

import { List } from "@raycast/api";

import usePosts from "@/hooks/usePosts";

import PostItem from "@/components/PostItem";

export type ProfilePostsProps = {
  userId: number;
};

export default function ProfilePosts({ userId }: ProfilePostsProps) {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const { data, isLoading } = usePosts(userId);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetails}>
      {data?.map((post) => (
        <PostItem
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
