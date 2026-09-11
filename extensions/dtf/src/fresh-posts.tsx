import { useState, useMemo } from "react";
import { List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { TimelineItem } from "./api/types";
import { API_CONFIG, transformPost } from "./api/client";
import { PostActions } from "./components/PostActions";
import { PostDetail } from "./components/PostDetail";
import { FreshSortingDropdown, FreshSortingType } from "./components/FreshSortingDropdown";
import { formatRelativeDate, formatNumber, getPostIcon } from "./utils/formatters";

interface FeedApiResponse {
  message?: string;
  result?: {
    items?: TimelineItem[];
    cursor?: string;
  };
}

export default function FreshPosts() {
  const [sorting, setSorting] = useState<FreshSortingType>("from-10");
  const [showingDetail, setShowingDetail] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);

  // Build base URL with sorting - pageName=new, isWithoutNews=true
  const baseUrl = `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/feed?markdown=false&sorting=${sorting}&pageName=new&isWithoutNews=true`;

  const { isLoading, data, pagination } = useFetch(
    (options) => {
      if (options.cursor) {
        return `${baseUrl}&cursor=${encodeURIComponent(options.cursor)}`;
      }
      return baseUrl;
    },
    {
      mapResult(result: FeedApiResponse) {
        const posts =
          result.result?.items?.filter((item) => item.type === "entry").map((item) => transformPost(item.data)) || [];

        return {
          data: posts,
          hasMore: !!result.result?.cursor && posts.length > 0,
          cursor: result.result?.cursor,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  const uniquePosts = useMemo(() => {
    if (!data) return [];
    const seen = new Set<number>();
    return data.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [data]);

  const toggleDetail = () => setShowingDetail((prev) => !prev);
  const toggleMetadata = () => setShowMetadata((prev) => !prev);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      pagination={pagination}
      navigationTitle="Fresh"
      searchBarPlaceholder="Filter by title..."
      searchBarAccessory={<FreshSortingDropdown onSortingChange={(v) => setSorting(v as FreshSortingType)} />}
    >
      {uniquePosts.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Clock} title="No fresh posts" description="Failed to load fresh posts" />
      ) : (
        uniquePosts.map((post) => (
          <List.Item
            key={post.id}
            title={post.title}
            subtitle={showingDetail ? undefined : post.author.name}
            icon={getPostIcon(post)}
            keywords={[post.author.name, post.subsite.name].filter(Boolean)}
            accessories={
              showingDetail
                ? undefined
                : [
                    { icon: Icon.Eye, text: formatNumber(post.stats.views) },
                    { icon: Icon.Bubble, text: formatNumber(post.stats.comments) },
                    { text: formatRelativeDate(post.date) },
                  ]
            }
            detail={<PostDetail post={post} showMetadata={showMetadata} />}
            actions={
              <PostActions
                post={post}
                onToggleDetail={toggleDetail}
                showDetailToggle={true}
                onToggleMetadata={toggleMetadata}
                showMetadataToggle={true}
              />
            }
          />
        ))
      )}
    </List>
  );
}
