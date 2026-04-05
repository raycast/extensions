import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { listPosts } from "../lib/api";
import { useWorkspace } from "../lib/useWorkspace";
import type { Post } from "../lib/types";
import { PostItem } from "./post-item";
import { ApiKeyRequiredView } from "./api-key-required";

interface PostListProps {
  fixedStatus?: string;
  title?: string;
}

export function PostList({ fixedStatus, title }: PostListProps) {
  const { isLoading: wsLoading, hasApiKey, navigationTitle } = useWorkspace();

  if (wsLoading) {
    return <List isLoading />;
  }

  if (!hasApiKey) {
    return <ApiKeyRequiredView />;
  }

  return (
    <PostListInner
      fixedStatus={fixedStatus}
      title={title}
      navigationTitle={navigationTitle}
    />
  );
}

function PostListInner({
  fixedStatus,
  title,
  navigationTitle,
}: PostListProps & { navigationTitle?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetail] = useCachedState("show-post-detail", false);

  async function fetchPosts() {
    setIsLoading(true);
    try {
      const response = await listPosts(fixedStatus, 50);
      setPosts(response.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load posts",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, [fixedStatus]);

  return (
    <List
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder={`Search ${title || "posts"}...`}
    >
      {posts.length === 0 && !isLoading ? (
        <List.EmptyView
          title={`No ${fixedStatus || ""} posts`}
          description="Create a new post to get started"
          icon="icon.png"
        />
      ) : (
        posts.map((post) => (
          <PostItem
            key={post.id}
            post={post}
            onRefresh={fetchPosts}
            showDetail={showDetail}
          />
        ))
      )}
    </List>
  );
}
