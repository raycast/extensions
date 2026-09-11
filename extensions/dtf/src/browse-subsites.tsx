import { useState, useMemo } from "react";
import { List, Icon, Action, ActionPanel, Image } from "@raycast/api";
import { useFetch, useCachedPromise } from "@raycast/utils";
import { getTopics, API_CONFIG, transformPost, buildImageUrl } from "./api/client";
import { TimelineItem, TopicSubsite } from "./api/types";
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

function SubsitePosts({ subsite, onBack }: { readonly subsite: TopicSubsite; readonly onBack: () => void }) {
  const [sorting, setSorting] = useState<SubsiteSortingType>("new");
  const [showingDetail, setShowingDetail] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);

  const subsiteAvatar = subsite.avatar?.data?.uuid ? buildImageUrl(subsite.avatar.data.uuid) : undefined;

  // Build base URL with sorting - ensures useFetch sees the dependency
  const baseUrl = `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/timeline?markdown=false&sorting=${sorting}&subsitesIds=${subsite.id}`;

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

  const subsiteIcon: Image.ImageLike = subsiteAvatar ? { source: subsiteAvatar, mask: Image.Mask.Circle } : Icon.Globe;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      pagination={pagination}
      navigationTitle={subsite.name}
      searchBarPlaceholder="Filter by title..."
      searchBarAccessory={<SubsiteSortingDropdown onSortingChange={(v) => setSorting(v as SubsiteSortingType)} />}
    >
      {uniquePosts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={subsiteIcon}
          title={`No posts in ${subsite.name}`}
          description="Try again later"
          actions={
            <ActionPanel>
              <Action title="Back to Topics" icon={Icon.ArrowLeft} onAction={onBack} />
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
              />
            }
          />
        ))
      )}
    </List>
  );
}

// Component for subsite list
function SubsiteListItem({ subsite, onSelect }: { readonly subsite: TopicSubsite; readonly onSelect: () => void }) {
  const avatarUrl = subsite.avatar?.data?.uuid ? buildImageUrl(subsite.avatar.data.uuid) : undefined;

  const icon: Image.ImageLike = avatarUrl ? { source: avatarUrl, mask: Image.Mask.Circle } : Icon.Globe;

  const subscribersText =
    subsite.counters.subscribers >= 1000
      ? `${(subsite.counters.subscribers / 1000).toFixed(0)}K`
      : `${subsite.counters.subscribers}`;

  return (
    <List.Item
      key={subsite.id}
      title={subsite.name}
      subtitle={subsite.description}
      icon={icon}
      accessories={[
        { icon: Icon.TwoPeople, text: subscribersText, tooltip: `${subsite.counters.subscribers} subscribers` },
      ]}
      actions={
        <ActionPanel>
          <Action title="Open Topic" icon={Icon.ArrowRight} onAction={onSelect} />
          <Action.OpenInBrowser title="Open in Browser" url={subsite.url} />
        </ActionPanel>
      }
    />
  );
}

export default function BrowseSubsites() {
  const [selectedSubsite, setSelectedSubsite] = useState<TopicSubsite | null>(null);

  // Load topics from API with cache
  const {
    data: topics,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(() => getTopics(), [], {
    keepPreviousData: true,
  });

  if (selectedSubsite) {
    return <SubsitePosts subsite={selectedSubsite} onBack={() => setSelectedSubsite(null)} />;
  }

  return (
    <List navigationTitle="DTF Topics" searchBarPlaceholder="Search topic..." isLoading={isLoading}>
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load topics"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : (
        topics?.map((subsite) => (
          <SubsiteListItem key={subsite.id} subsite={subsite} onSelect={() => setSelectedSubsite(subsite)} />
        ))
      )}
    </List>
  );
}
