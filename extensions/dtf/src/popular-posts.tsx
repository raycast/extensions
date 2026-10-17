import { useState, useMemo } from "react";
import { List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { TimelineItem } from "./api/types";
import { API_CONFIG, transformPost } from "./api/client";
import { PostActions } from "./components/PostActions";
import { PostDetail } from "./components/PostDetail";
import { PeriodDropdown, PeriodType, getPeriodSorting } from "./components/PeriodDropdown";
import { formatRelativeDate, formatNumber, getPostIcon } from "./utils/formatters";

interface FeedApiResponse {
  message?: string;
  result?: {
    items?: TimelineItem[];
    cursor?: string;
  };
}

export default function PopularPosts() {
  const [period, setPeriod] = useState<PeriodType>("today");
  const [showingDetail, setShowingDetail] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);

  // Build base URL with period - this ensures useFetch sees the dependency
  const sorting = getPeriodSorting(period);
  const baseUrl = `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/feed?markdown=false&sorting=${sorting}&pageName=popular&isWithoutNews=false`;

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
      navigationTitle="Popular"
      searchBarPlaceholder="Filter by title..."
      searchBarAccessory={<PeriodDropdown onPeriodChange={(v) => setPeriod(v as PeriodType)} />}
    >
      {uniquePosts.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Star} title="No popular posts" description="Failed to load popular posts" />
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
