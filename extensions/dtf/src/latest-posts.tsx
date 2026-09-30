import { useState, useMemo, useEffect } from "react";
import { List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { TimelineItem } from "./api/types";
import { API_CONFIG, transformPost } from "./api/client";
import { PostActions } from "./components/PostActions";
import { PostDetail } from "./components/PostDetail";
import { SortingDropdown, SortingType } from "./components/SortingDropdown";
import { formatRelativeDate, formatNumber, getPostIcon } from "./utils/formatters";

interface TimelineApiResponse {
  message?: string;
  result?: {
    items?: TimelineItem[];
    cursor?: string;
  };
}

export default function LatestPosts() {
  const [sorting, setSorting] = useState<SortingType>("date");
  const [showingDetail, setShowingDetail] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);

  const { isLoading, data, pagination, revalidate } = useFetch(
    (options) => {
      const params = new URLSearchParams({
        markdown: "false",
        sorting: sorting,
      });
      // API v2.10 uses cursor for pagination
      if (options.cursor) {
        params.set("cursor", options.cursor);
      }
      return `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/timeline?${params}`;
    },
    {
      mapResult(result: TimelineApiResponse) {
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

  useEffect(() => {
    revalidate();
  }, [sorting]);

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
      navigationTitle="Latest Posts"
      searchBarPlaceholder="Filter by title..."
      searchBarAccessory={<SortingDropdown onSortingChange={(v) => setSorting(v as SortingType)} />}
    >
      {uniquePosts.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Document} title="No posts" description="Failed to load feed" />
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
