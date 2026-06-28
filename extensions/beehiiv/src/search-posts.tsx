import { ActionPanel, Action, List, getPreferenceValues, Icon, Cache } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import fetch from "node-fetch";

const preferences = getPreferenceValues();

interface Post {
  id: string;
  title: string;
  subtitle: string;
  authors: string[];
  created: number;
  status: string;
  publish_date: number;
  displayed_date: number;
  web_url: string;
  thumbnail_url: string;
  audience: string;
  stats?: {
    email?: {
      recipients: number;
      opens: number;
      unique_opens: number;
      clicks: number;
    };
    web?: {
      views: number;
      clicks: number;
    };
  };
}

// Create a cache instance
const cache = new Cache();

// Main command component
export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [lastFetchedStats, setLastFetchedStats] = useState<{ [key: string]: number }>({});
  const fetchInProgressRef = useRef<string | null>(null);

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchText.toLowerCase()) ||
      post.subtitle.toLowerCase().includes(searchText.toLowerCase())
  );

  let isRunning = false;

  const startReloading = async () => {
    const cachedPosts = JSON.parse((await cache.get("beehiivPosts")) || "[]");
    if (cachedPosts) {
      setPosts(cachedPosts);
    }
    if (isRunning) return;
    isRunning = true;
    fetchPosts();
  };

  const clearCache = async () => {
    cache.clear();
  };

  const fetchPostStats = async (postId: string) => {
    try {
      if (fetchInProgressRef.current === postId) {
        console.info("Fetch already in progress for", postId);
        return;
      }
      fetchInProgressRef.current = postId;
      console.info("fetchPostStats called for postId:", postId);
      // Sprawdź czy minęło wystarczająco dużo czasu od ostatniego pobrania
      const now = Date.now();
      const lastFetch = lastFetchedStats[postId] || 0;
      console.info("Time since last fetch:", (now - lastFetch) / 1000, "seconds");
      if (now - lastFetch < 5000) {
        console.info("Skipping fetch - too soon");
        return;
      }

      console.info("Fetching stats for post:", postId);
      const response = await fetch(
        `https://api.beehiiv.com/v2/publications/${preferences.publicationId}/posts/${postId}?expand[]=stats`,
        {
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Response not ok:", response.status, response.statusText);
        throw new Error("Failed to fetch post stats");
      }

      const data = await response.json();
      const updatedPost = data.data as Post;

      console.info("Updating post stats in state");
      // Update post stats in the posts array
      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === postId ? { ...post, stats: updatedPost.stats } : post))
      );

      // Update cache
      const cachedPosts = JSON.parse((await cache.get("beehiivPosts")) || "[]");
      const updatedCache = cachedPosts.map((post: Post) =>
        post.id === postId ? { ...post, stats: updatedPost.stats } : post
      );
      await cache.set("beehiivPosts", JSON.stringify(updatedCache));

      // Update last fetch time
      setLastFetchedStats((prev) => ({
        ...prev,
        [postId]: now,
      }));
      console.info("Stats update completed for post:", postId);
    } catch (error) {
      console.error("Error fetching post stats:", error);
    } finally {
      // Reset ref so future selections can trigger fetch
      if (fetchInProgressRef.current === postId) {
        fetchInProgressRef.current = null;
      }
    }
  };

  const fetchPosts = async (page: number = 1, allPosts: Post[] = []) => {
    setIsLoading(true);
    try {
      console.info("PAGE: " + page);
      const response = await fetch(
        `https://api.beehiiv.com/v2/publications/${preferences.publicationId}/posts?expand[]=stats&limit=100&order_by=created&direction=desc&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error(response);
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();
      const fetchedPosts = data.data as Post[];

      // Check if we've found any posts that are already in cache
      const cachedPosts = JSON.parse((await cache.get("beehiivPosts")) || "[]");
      const foundExistingPost = fetchedPosts.some((newPost) =>
        cachedPosts.some((cachedPost: Post) => cachedPost.created === newPost.created)
      );

      allPosts = [...allPosts, ...fetchedPosts];

      if (page < data.total_pages && !foundExistingPost) {
        fetchPosts(page + 1, allPosts);
      } else {
        isRunning = false;
        // Sort posts by displayed_date or publish_date, fallback to created
        const sortedPosts = allPosts.sort((a, b) => {
          const dateA = a.displayed_date || a.publish_date || a.created;
          const dateB = b.displayed_date || b.publish_date || b.created;
          return dateB - dateA;
        });
        setPosts(sortedPosts);
        setIsLoading(false);
        await cache.set("beehiivPosts", JSON.stringify(sortedPosts));
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startReloading();
  }, []);

  useEffect(() => {
    console.info("useEffect triggered, selectedPostId:", selectedPostId);
    if (!selectedPostId) return;

    const selectedPost = posts.find((p) => p.id === selectedPostId);
    if (!selectedPost) return;

    const now = Date.now();
    const lastFetch = lastFetchedStats[selectedPostId] || 0;
    const refetchDelay = 60;

    if (selectedPost.stats && now - lastFetch < refetchDelay) {
      console.info("Stats are fresh, skipping fetch");
      return;
    }

    fetchPostStats(selectedPostId);
  }, [selectedPostId, posts, lastFetchedStats]);

  function PostListItem({ post }: { post: Post }) {
    const parseDate = (date: number) => {
      if (date) {
        return new Date(date * 1000).toISOString().replace("T", " ").slice(0, 19);
      } else {
        return "-";
      }
    };
    const parseStatus = (status: string) => {
      switch (status) {
        case "confirmed":
          return "Published";
        case "draft":
          return "Draft";
        case "archived":
          return "Archived";
        default:
          return status;
      }
    };
    const markdown = `![Thumbnail](${post.thumbnail_url})`;
    return (
      <List.Item
        id={post.id}
        title={post.title}
        accessories={[
          {
            icon:
              post.status === "confirmed"
                ? post.publish_date * 1000 < new Date().getTime()
                  ? Icon.CheckCircle
                  : Icon.Clock
                : post.status === "archived"
                ? Icon.CircleDisabled
                : Icon.Circle,
          },
        ]}
        actions={
          <ActionPanel>
            {post.status === "confirmed" && (
              <Action.OpenInBrowser
                title="Open Performance"
                url={`https://app.beehiiv.com/posts/${post.id.replace("post_", "")}/analytics`}
              />
            )}
            {post.status === "confirmed" && <Action.OpenInBrowser title="Open Published" url={post.web_url} />}
            <Action.OpenInBrowser
              title="Open Overview"
              url={`https://app.beehiiv.com/posts/${post.id.replace("post_", "")}`}
            />
            <Action.OpenInBrowser
              title="Edit Post"
              icon={Icon.Pencil}
              url={`https://app.beehiiv.com/posts/${post.id.replace("post_", "")}/edit`}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              content={post.web_url}
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Title"
              content={post.title}
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action title="Refresh Posts" onAction={startReloading} icon={Icon.ArrowClockwise} />
            <Action title="Clear Posts Cache" onAction={clearCache} icon={Icon.XMarkCircle} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.TagList title="Status">
                  {post.status == "confirmed" ? (
                    post.publish_date * 1000 < new Date().getTime() ? (
                      <List.Item.Detail.Metadata.TagList.Item
                        text={parseStatus(post.status)}
                        icon={Icon.CheckCircle}
                        color={"green"}
                      />
                    ) : (
                      <List.Item.Detail.Metadata.TagList.Item text="Scheduled" icon={Icon.Clock} color={"yellow"} />
                    )
                  ) : post.status == "draft" ? (
                    <List.Item.Detail.Metadata.TagList.Item text={parseStatus(post.status)} icon={Icon.Circle} />
                  ) : (
                    <List.Item.Detail.Metadata.TagList.Item
                      text={parseStatus(post.status)}
                      icon={Icon.CircleDisabled}
                      color={"gray"}
                    />
                  )}
                </List.Item.Detail.Metadata.TagList>
                <List.Item.Detail.Metadata.Label
                  title="Date"
                  text={parseDate(post.displayed_date || post.publish_date)}
                  icon={Icon.Calendar}
                />

                <List.Item.Detail.Metadata.TagList title="Audience">
                  {(post.audience == "both" || post.audience == "free") && (
                    <List.Item.Detail.Metadata.TagList.Item text="Free" color={"green"} icon={Icon.Person} />
                  )}

                  {(post.audience == "both" || post.audience == "premium") && (
                    <List.Item.Detail.Metadata.TagList.Item text="Premium" color={"purple"} icon={Icon.CheckRosette} />
                  )}
                </List.Item.Detail.Metadata.TagList>

                {post.stats?.email && (
                  <List.Item.Detail.Metadata.TagList title="E-mail Stats">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={post.stats.email.recipients.toString()}
                      icon={Icon.Envelope}
                    />
                    <List.Item.Detail.Metadata.TagList.Item
                      text={post.stats.email.unique_opens.toString()}
                      icon={Icon.Eye}
                    />
                    <List.Item.Detail.Metadata.TagList.Item
                      text={post.stats.email.clicks.toString()}
                      icon={Icon.ArrowNe}
                    />
                  </List.Item.Detail.Metadata.TagList>
                )}
                {post.stats?.web && (
                  <List.Item.Detail.Metadata.TagList title="Web Stats">
                    <List.Item.Detail.Metadata.TagList.Item text={post.stats.web.views.toString()} icon={Icon.Eye} />
                    <List.Item.Detail.Metadata.TagList.Item
                      text={post.stats.web.clicks.toString()}
                      icon={Icon.ArrowNe}
                    />
                  </List.Item.Detail.Metadata.TagList>
                )}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search posts..."
      throttle
      isShowingDetail={true}
      onSelectionChange={(post) => {
        console.info("onSelectionChange called with:", post);
        if (!post) return;
        // Ignore if we are currently fetching this post's stats
        if (fetchInProgressRef.current === post) {
          console.info("Ignoring selection - fetch in progress for", post);
          return;
        }
        if (post !== selectedPostId) {
          console.info("Setting selectedPostId to:", post);
          setSelectedPostId(post);
        }
      }}
    >
      {filteredPosts.map((post) => (
        <PostListItem key={post.id} post={post} />
      ))}
    </List>
  );
}
