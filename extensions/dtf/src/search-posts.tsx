import { useState, useMemo } from "react";
import { List, Icon, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { TimelineItem } from "./api/types";
import { API_CONFIG, transformPost } from "./api/client";
import { PostActions } from "./components/PostActions";
import { PostDetail } from "./components/PostDetail";
import { formatRelativeDate, formatNumber, getPostIcon } from "./utils/formatters";

interface SearchResponse {
  message?: string;
  result?: {
    contents?: TimelineItem[];
    items?: TimelineItem[];
    lastId?: number;
  };
  items?: TimelineItem[];
  contents?: TimelineItem[];
}

interface SearchArguments {
  readonly query?: string;
}

interface SearchPostsLaunchProps {
  readonly arguments: SearchArguments;
}

type SearchPostsProps = Readonly<LaunchProps<SearchPostsLaunchProps>>;

export default function SearchPosts({ arguments: args }: SearchPostsProps) {
  const initialQuery = args?.query || "";
  const [searchText, setSearchText] = useState(initialQuery);
  const [showingDetail, setShowingDetail] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false); // Hidden by default

  const apiUrl = searchText.trim()
    ? `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/search?query=${encodeURIComponent(searchText.trim())}&order_by=relevant`
    : null;

  const { isLoading, data } = useFetch<SearchResponse>(apiUrl || "", {
    execute: !!apiUrl,
  });

  const posts = useMemo(() => {
    if (!data) return [];
    const items = data.result?.contents || data.result?.items || data.contents || data.items || [];
    return items.filter((item) => item.type === "entry").map((item) => transformPost(item.data));
  }, [data]);

  const toggleDetail = () => setShowingDetail((prev) => !prev);
  const toggleMetadata = () => setShowMetadata((prev) => !prev);

  return (
    <List
      isLoading={isLoading && !!searchText}
      isShowingDetail={showingDetail}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle={true}
      navigationTitle="Search"
      searchBarPlaceholder="Search on DTF..."
    >
      {posts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "Nothing found" : "Enter a query"}
          description={searchText ? "Try changing your search query" : "Start typing to search"}
        />
      ) : (
        posts.map((post, index) => (
          <List.Item
            key={`${post.id}-${index}`}
            title={post.title}
            subtitle={showingDetail ? undefined : post.author.name}
            icon={getPostIcon(post)}
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
