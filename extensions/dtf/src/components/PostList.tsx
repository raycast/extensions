import { List, Icon } from "@raycast/api";
import { useState } from "react";
import { DisplayPost } from "../api/types";
import { PostActions } from "./PostActions";
import { PostDetail } from "./PostDetail";
import { formatRelativeDate, formatNumber } from "../utils/formatters";

interface PostListProps {
  readonly posts: DisplayPost[];
  readonly isLoading: boolean;
  readonly searchBarPlaceholder?: string;
  readonly onSearchTextChange?: (text: string) => void;
  readonly throttle?: boolean;
  readonly navigationTitle?: string;
  readonly emptyViewTitle?: string;
  readonly emptyViewDescription?: string;
}

export function PostList({
  posts,
  isLoading,
  searchBarPlaceholder,
  onSearchTextChange,
  throttle = true,
  navigationTitle,
  emptyViewTitle = "No posts",
  emptyViewDescription = "Try changing your search query",
}: PostListProps) {
  const [showingDetail, setShowingDetail] = useState(true);

  const toggleDetail = () => setShowingDetail((prev) => !prev);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={onSearchTextChange}
      throttle={throttle}
      navigationTitle={navigationTitle}
    >
      {posts.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={emptyViewTitle} description={emptyViewDescription} />
      ) : (
        posts.map((post) => (
          <List.Item
            key={post.id}
            title={post.title}
            subtitle={showingDetail ? undefined : post.author.name}
            icon={post.subsite.avatar || Icon.Document}
            accessories={
              showingDetail
                ? undefined
                : [
                    { icon: Icon.Eye, text: formatNumber(post.stats.views) },
                    { icon: Icon.Bubble, text: formatNumber(post.stats.comments) },
                    { text: formatRelativeDate(post.date) },
                  ]
            }
            detail={<PostDetail post={post} />}
            actions={<PostActions post={post} onToggleDetail={toggleDetail} showDetailToggle={true} />}
          />
        ))
      )}
    </List>
  );
}
