import { useState, useMemo } from "react";
import { List, Icon, Action, ActionPanel, Image, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BlogItem, BlogData, BlogsApiResponse, TimelineItem } from "./api/types";
import { API_CONFIG, transformPost, buildImageUrl } from "./api/client";
import { PostDetail } from "./components/PostDetail";
import { PostActions } from "./components/PostActions";
import { SubsiteSortingDropdown, SubsiteSortingType } from "./components/SubsiteSortingDropdown";
import { formatRelativeDate, formatNumber, getPostIcon } from "./utils/formatters";

interface TimelineApiResponse {
  message?: string;
  result?: {
    items?: TimelineItem[];
    cursor?: string;
  };
}

function getRankChangeAccessory(item: BlogItem): {
  icon: Image.ImageLike;
  text: string;
  tooltip: string;
} | null {
  const { rank, prevRank } = item.meta;

  if (prevRank === null) {
    // New blog in ranking
    return {
      icon: { source: Icon.Stars, tintColor: Color.Yellow },
      text: "NEW",
      tooltip: "New in ranking",
    };
  }

  const diff = prevRank - rank;

  if (diff > 0) {
    // Moved up
    const positionWord = diff === 1 ? "position" : "positions";
    return {
      icon: { source: Icon.ArrowUp, tintColor: Color.Green },
      text: `+${diff}`,
      tooltip: `Moved up ${diff} ${positionWord}`,
    };
  } else if (diff < 0) {
    // Moved down
    const absDiff = Math.abs(diff);
    const positionWord = absDiff === 1 ? "position" : "positions";
    return {
      icon: { source: Icon.ArrowDown, tintColor: Color.Red },
      text: `${diff}`,
      tooltip: `Moved down ${absDiff} ${positionWord}`,
    };
  }

  // No change - return null
  return null;
}

// Component for displaying blog posts
function BlogPosts({ blog, onBack }: { readonly blog: BlogData; readonly onBack: () => void }) {
  const [sorting, setSorting] = useState<SubsiteSortingType>("new");
  const [showingDetail, setShowingDetail] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);

  const blogAvatar = blog.avatar?.data?.uuid ? buildImageUrl(blog.avatar.data.uuid) : undefined;

  // Build base URL with sorting - ensures useFetch sees the dependency
  const baseUrl = `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/timeline?markdown=false&sorting=${sorting}&subsitesIds=${blog.id}`;

  const { isLoading, data, pagination } = useFetch(
    (options) => {
      if (options.cursor) {
        return `${baseUrl}&cursor=${encodeURIComponent(options.cursor)}`;
      }
      return baseUrl;
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

  const blogIcon: Image.ImageLike = blogAvatar ? { source: blogAvatar, mask: Image.Mask.Circle } : Icon.Person;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      pagination={pagination}
      navigationTitle={blog.name}
      searchBarPlaceholder="Filter by title..."
      searchBarAccessory={<SubsiteSortingDropdown onSortingChange={(v) => setSorting(v as SubsiteSortingType)} />}
    >
      {uniquePosts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={blogIcon}
          title={`No posts from ${blog.name}`}
          description="Try again later"
          actions={
            <ActionPanel>
              <Action title="Back to Top Blogs" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel>
          }
        />
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
                extraActions={<Action title="Back to Top Blogs" icon={Icon.ArrowLeft} onAction={onBack} />}
              />
            }
          />
        ))
      )}
    </List>
  );
}

function BlogListItem({ item, onSelect }: { readonly item: BlogItem; readonly onSelect: () => void }) {
  const blog = item.data;
  const avatarUrl = blog.avatar?.data?.uuid ? buildImageUrl(blog.avatar.data.uuid) : undefined;

  const icon: Image.ImageLike = avatarUrl ? { source: avatarUrl, mask: Image.Mask.Circle } : Icon.Person;

  const rankChange = getRankChangeAccessory(item);

  const subscribersText = formatNumber(blog.counters.subscribers);
  const weekStatsText = formatNumber(blog.count_stats_7d);

  // Rank on the left in title
  const title = `#${item.meta.rank}  ${blog.name}`;

  // Build accessories - rank change on the left (if any)
  const accessories: List.Item.Accessory[] = [];

  if (rankChange) {
    accessories.push({
      icon: rankChange.icon,
      text: rankChange.text,
      tooltip: rankChange.tooltip,
    });
  }

  accessories.push(
    {
      icon: Icon.TwoPeople,
      text: subscribersText,
      tooltip: `${blog.counters.subscribers} subscribers`,
    },
    {
      icon: Icon.LineChart,
      text: weekStatsText,
      tooltip: `7-day activity: ${blog.count_stats_7d}`,
    },
  );

  return (
    <List.Item
      key={blog.id}
      title={title}
      subtitle={blog.description || undefined}
      icon={icon}
      keywords={[blog.nickname || "", blog.name, `#${item.meta.rank}`]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Open Posts" icon={Icon.List} onAction={onSelect} />
          <Action.OpenInBrowser title="Open in Browser" url={blog.url} />
          <Action.CopyToClipboard title="Copy Link" content={blog.url} />
        </ActionPanel>
      }
    />
  );
}

export default function TopBlogs() {
  const [selectedBlog, setSelectedBlog] = useState<BlogData | null>(null);

  const { isLoading, data, error, revalidate } = useFetch<BlogsApiResponse>(
    `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/discovery/blogs`,
    {
      keepPreviousData: true,
    },
  );

  const blogs = data?.result || [];

  if (selectedBlog) {
    return <BlogPosts blog={selectedBlog} onBack={() => setSelectedBlog(null)} />;
  }

  const renderContent = () => {
    if (error) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Loading Error"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      );
    }

    if (blogs.length === 0 && !isLoading) {
      return <List.EmptyView icon={Icon.Person} title="No blogs" description="Failed to load top blogs" />;
    }

    return blogs.map((item) => (
      <BlogListItem key={item.data.id} item={item} onSelect={() => setSelectedBlog(item.data)} />
    ));
  };

  return (
    <List navigationTitle="Top Blogs" searchBarPlaceholder="Search blog..." isLoading={isLoading}>
      {renderContent()}
    </List>
  );
}
