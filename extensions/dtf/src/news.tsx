import { useState, useMemo, useEffect, useCallback } from "react";
import { List, Icon } from "@raycast/api";
import { DisplayPost, Post } from "./api/types";
import { API_CONFIG, transformPost } from "./api/client";
import { PostActions } from "./components/PostActions";
import { PostDetail } from "./components/PostDetail";
import { formatRelativeDate, formatNumber, getPostIcon } from "./utils/formatters";

// News API does NOT support sorting and count - always by date, 4 items at a time

interface NewsApiResponse {
  message?: string;
  result?: {
    news?: Post[];
    lastId?: number;
  };
}

// Number of initial pages to load (4 posts * 3 pages = 12 posts)
const INITIAL_PAGES = 3;

async function fetchNewsPage(
  lastId?: number,
  lastSortingValue?: number,
): Promise<{
  posts: DisplayPost[];
  rawPosts: Post[];
  lastId?: number;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({ markdown: "false" });
    if (lastId) {
      params.set("lastId", String(lastId));
    }
    if (lastSortingValue) {
      params.set("lastSortingValue", String(lastSortingValue));
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/news?${params}`);

    if (!response.ok) {
      return { posts: [], rawPosts: [], error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as NewsApiResponse;

    const rawPosts = data.result?.news || [];
    const posts = rawPosts.map(transformPost);

    return {
      posts,
      rawPosts,
      lastId: data.result?.lastId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { posts: [], rawPosts: [], error: message };
  }
}

export default function News() {
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<{ lastId: number; lastSortingValue: number } | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showingDetail, setShowingDetail] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);

  // Initial load of several pages
  useEffect(() => {
    async function loadInitialPages() {
      setIsLoading(true);
      const allPosts: DisplayPost[] = [];
      let currentLastId: number | undefined;
      let currentLastSortingValue: number | undefined;

      for (let i = 0; i < INITIAL_PAGES; i++) {
        const result = await fetchNewsPage(currentLastId, currentLastSortingValue);
        allPosts.push(...result.posts);

        if (!result.lastId || result.rawPosts.length === 0) {
          setHasMore(false);
          break;
        }

        currentLastId = result.lastId;
        currentLastSortingValue = result.rawPosts.at(-1)?.date;
      }

      setPosts(allPosts);
      if (currentLastId && currentLastSortingValue) {
        setCursor({ lastId: currentLastId, lastSortingValue: currentLastSortingValue });
      }
      setIsLoading(false);
    }

    loadInitialPages();
  }, []);

  // Load next page
  const loadMore = useCallback(async () => {
    if (!cursor || !hasMore || isLoading) return;

    setIsLoading(true);
    const result = await fetchNewsPage(cursor.lastId, cursor.lastSortingValue);

    if (result.posts.length > 0) {
      setPosts((prev) => [...prev, ...result.posts]);
    }

    if (result.lastId && result.rawPosts.length > 0) {
      const lastSortingValue = result.rawPosts.at(-1)?.date;
      if (lastSortingValue) {
        setCursor({ lastId: result.lastId, lastSortingValue });
      }
    } else {
      setHasMore(false);
    }

    setIsLoading(false);
  }, [cursor, hasMore, isLoading]);

  const uniquePosts = useMemo(() => {
    const seen = new Set<number>();
    return posts.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [posts]);

  const toggleDetail = () => setShowingDetail((prev) => !prev);
  const toggleMetadata = () => setShowMetadata((prev) => !prev);

  // Pagination for List
  const pagination = hasMore
    ? {
        onLoadMore: loadMore,
        hasMore,
        pageSize: 4,
      }
    : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      pagination={pagination}
      navigationTitle="News"
      searchBarPlaceholder="Filter by title..."
    >
      {uniquePosts.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Document} title="No news" description="Failed to load news" />
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
