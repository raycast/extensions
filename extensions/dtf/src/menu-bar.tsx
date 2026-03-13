import { useEffect, useState } from "react";
import {
  MenuBarExtra,
  open,
  getPreferenceValues,
  Icon,
  Cache,
  Clipboard,
  showHUD,
  launchCommand,
  LaunchType,
  Image,
  Keyboard,
} from "@raycast/api";
import {
  getPopularPosts,
  getFreshPosts,
  getTimeline,
  getTopics,
  getSubsitePosts,
  getNews,
  getTopBlogs,
  buildImageUrl,
} from "./api/client";
import { DisplayPost, TopicSubsite, BlogData } from "./api/types";
import { formatRelativeDateShort, formatNumber, truncateText } from "./utils/formatters";
import { showFailureToast } from "@raycast/utils";

// Cache for storing posts between refreshes
const cache = new Cache();
const CACHE_KEY_NEWS = "menubar_news";
const CACHE_KEY_POPULAR = "menubar_popular";
const CACHE_KEY_FRESH = "menubar_fresh";
const CACHE_KEY_LATEST = "menubar_latest";
const CACHE_KEY_TOPICS = "menubar_topics";
const CACHE_KEY_TOP_BLOGS = "menubar_top_blogs";
const CACHE_KEY_LAST_UPDATE = "menubar_last_update";

interface Preferences {
  // Menu bar display
  menuBarDisplayMode: "icon" | "count" | "title" | "stats";
  menuBarTitleSource: "news" | "popular" | "latest";
  menuBarTitleMaxLength: string;
  statsTextFormat: "shortest" | "short" | "full";
  titleRotationInterval: string;

  // Sections
  showNewsSection: boolean;
  showPopularSection: boolean;
  showFreshSection: boolean;
  showLatestSection: boolean;
  showTopicsSection: boolean;
  showTopBlogsSection: boolean;

  // Counts
  newsPostsCount: string;
  popularPostsCount: string;
  freshPostsCount: string;
  latestPostsCount: string;
  topicsPostsCount: string;
  topBlogsPostsCount: string;

  // Display options
  showPostViews: boolean;
  showPostComments: boolean;
  showPostCategory: boolean;
  showPostAuthors: boolean;
  showPostTime: boolean;
  compactTitles: boolean;
  titleMaxLength: string;
  showPostIcons: boolean;

  // Actions
  primaryAction: "browser" | "copy";
  showOpenDTFAction: boolean;
  showRefreshAction: boolean;
  showSearchAction: boolean;
  showMoreSection: boolean;
}

// Global timeout for menu bar data fetch (60 seconds max)
const MENU_BAR_FETCH_TIMEOUT = 60000;

// Promise with timeout
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))]);
}

// Fetch news with pagination using API client
async function fetchNewsPaginated(targetCount: number): Promise<DisplayPost[]> {
  const allPosts: DisplayPost[] = [];
  let lastId: number | undefined;
  const maxPages = Math.ceil(targetCount / 4); // API returns 4 items per page

  for (let i = 0; i < maxPages && allPosts.length < targetCount; i++) {
    try {
      const result = await getNews(lastId);
      if (result.posts.length === 0) break;

      allPosts.push(...result.posts);
      lastId = result.lastId;

      if (!lastId) break;
    } catch {
      // Stop pagination on error, return what we have
      break;
    }
  }

  return allPosts.slice(0, targetCount);
}

// Get menu bar icon based on appearance
function getMenuBarIcon(): Image.ImageLike {
  return {
    source: {
      light: "menubar_icon.svg",
      dark: "menubar_icon@dark.svg",
    },
  };
}

// Get topic icon from avatar
function getTopicIcon(topic: TopicSubsite): Image.ImageLike | undefined {
  if (topic.avatar?.data?.uuid) {
    return {
      source: buildImageUrl(topic.avatar.data.uuid),
      mask: Image.Mask.Circle,
    };
  }
  return undefined;
}

// Get blog icon from avatar
function getBlogIcon(blog: BlogData): Image.ImageLike | undefined {
  if (blog.avatar?.data?.uuid) {
    return {
      source: buildImageUrl(blog.avatar.data.uuid),
      mask: Image.Mask.Circle,
    };
  }
  return undefined;
}

// Get post icon from subsite or author avatar
function getPostIcon(post: DisplayPost): Image.ImageLike | undefined {
  // Prefer subsite avatar if available
  if (post.subsite?.avatar) {
    return {
      source: post.subsite.avatar,
      mask: Image.Mask.Circle,
    };
  }
  // Fall back to author avatar
  if (post.author?.avatar) {
    return {
      source: post.author.avatar,
      mask: Image.Mask.Circle,
    };
  }
  return undefined;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface TopicWithPosts {
  topic: TopicSubsite;
  posts: DisplayPost[];
}

interface BlogWithPosts {
  blog: BlogData;
  posts: DisplayPost[];
}

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached) {
    try {
      const parsed: CachedData<T> = JSON.parse(cached);
      return parsed.data;
    } catch {
      return null;
    }
  }
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  const cacheData: CachedData<T> = {
    data,
    timestamp: Date.now(),
  };
  cache.set(key, JSON.stringify(cacheData));
}

// Fetch topic with its posts
async function fetchTopicWithPosts(topic: TopicSubsite, postsCount: number): Promise<TopicWithPosts> {
  try {
    const result = await getSubsitePosts(topic.id);
    return {
      topic,
      posts: result.posts.slice(0, postsCount),
    };
  } catch {
    return { topic, posts: [] };
  }
}

// Fetch all topics with their posts
async function fetchTopicsWithPosts(topicsCount: number): Promise<TopicWithPosts[]> {
  try {
    const topics = await getTopics();
    const topTopics = topics.slice(0, 5);
    return Promise.all(topTopics.map((topic) => fetchTopicWithPosts(topic, topicsCount)));
  } catch {
    return [];
  }
}

// Fetch blog with its posts
async function fetchBlogWithPosts(blog: BlogData, postsCount: number): Promise<BlogWithPosts> {
  try {
    const result = await getSubsitePosts(blog.id);
    return {
      blog,
      posts: result.posts.slice(0, postsCount),
    };
  } catch {
    return { blog, posts: [] };
  }
}

// Fetch all top blogs with their posts
async function fetchTopBlogsWithPosts(blogsCount: number): Promise<BlogWithPosts[]> {
  try {
    const blogs = await getTopBlogs();
    const topBlogs = blogs.slice(0, 5);
    return Promise.all(topBlogs.map((blog) => fetchBlogWithPosts(blog, blogsCount)));
  } catch {
    return [];
  }
}

export default function MenuBar() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(() => {
    const cached = getCachedData<string>(CACHE_KEY_LAST_UPDATE);
    return cached ? new Date(cached) : null;
  });

  // Post states
  const [newsPosts, setNewsPosts] = useState<DisplayPost[]>(() => getCachedData(CACHE_KEY_NEWS) || []);
  const [popularPosts, setPopularPosts] = useState<DisplayPost[]>(() => getCachedData(CACHE_KEY_POPULAR) || []);
  const [freshPosts, setFreshPosts] = useState<DisplayPost[]>(() => getCachedData(CACHE_KEY_FRESH) || []);
  const [latestPosts, setLatestPosts] = useState<DisplayPost[]>(() => getCachedData(CACHE_KEY_LATEST) || []);
  const [topicsWithPosts, setTopicsWithPosts] = useState<TopicWithPosts[]>(() => getCachedData(CACHE_KEY_TOPICS) || []);
  const [topBlogsWithPosts, setTopBlogsWithPosts] = useState<BlogWithPosts[]>(
    () => getCachedData(CACHE_KEY_TOP_BLOGS) || [],
  );

  // Counts
  const newsCount = Number.parseInt(preferences.newsPostsCount) || 8;
  const popularCount = Number.parseInt(preferences.popularPostsCount) || 5;
  const freshCount = Number.parseInt(preferences.freshPostsCount) || 5;
  const latestCount = Number.parseInt(preferences.latestPostsCount) || 5;
  const topicsCount = Number.parseInt(preferences.topicsPostsCount) || 3;
  const topBlogsCount = Number.parseInt(preferences.topBlogsPostsCount) || 3;
  const titleMaxLength = Number.parseInt(preferences.titleMaxLength) || 50;
  const menuBarTitleMaxLength = Number.parseInt(preferences.menuBarTitleMaxLength) || 25;
  const rotationInterval = Number.parseInt(preferences.titleRotationInterval) || 0;

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);

      try {
        const promises: Promise<void>[] = [];

        // Fetch news with pagination if enabled or needed for menu bar display
        if (preferences.showNewsSection || preferences.menuBarTitleSource === "news") {
          promises.push(
            fetchNewsPaginated(newsCount).then((posts) => {
              setNewsPosts(posts);
              setCachedData(CACHE_KEY_NEWS, posts);
            }),
          );
        }

        // Fetch popular if enabled or needed for menu bar display
        if (preferences.showPopularSection || preferences.menuBarTitleSource === "popular") {
          promises.push(
            getPopularPosts().then((posts) => {
              const sliced = posts.slice(0, popularCount);
              setPopularPosts(sliced);
              setCachedData(CACHE_KEY_POPULAR, sliced);
            }),
          );
        }

        // Fetch fresh if enabled
        if (preferences.showFreshSection) {
          promises.push(
            getFreshPosts().then((posts) => {
              const sliced = posts.slice(0, freshCount);
              setFreshPosts(sliced);
              setCachedData(CACHE_KEY_FRESH, sliced);
            }),
          );
        }

        // Fetch latest if enabled or needed for menu bar display
        if (preferences.showLatestSection || preferences.menuBarTitleSource === "latest") {
          promises.push(
            getTimeline().then((result) => {
              const sliced = result.posts.slice(0, latestCount);
              setLatestPosts(sliced);
              setCachedData(CACHE_KEY_LATEST, sliced);
            }),
          );
        }

        // Fetch topics if enabled
        if (preferences.showTopicsSection) {
          promises.push(
            fetchTopicsWithPosts(topicsCount).then((topicsData) => {
              setTopicsWithPosts(topicsData);
              setCachedData(CACHE_KEY_TOPICS, topicsData);
            }),
          );
        }

        // Fetch top blogs if enabled
        if (preferences.showTopBlogsSection) {
          promises.push(
            fetchTopBlogsWithPosts(topBlogsCount).then((blogsData) => {
              setTopBlogsWithPosts(blogsData);
              setCachedData(CACHE_KEY_TOP_BLOGS, blogsData);
            }),
          );
        }

        // Wait for all promises with a global timeout
        await withTimeout(
          Promise.all(promises),
          MENU_BAR_FETCH_TIMEOUT,
          "Request timeout - check your internet connection",
        );
        // Update last update time on success
        const now = new Date();
        setLastUpdate(now);
        setCachedData(CACHE_KEY_LAST_UPDATE, now.toISOString());
        setError(null);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        // Show user-friendly error messages
        let errorMessage = "Failed to load data";
        if (err instanceof Error) {
          if (err.message.includes("ENOTFOUND") || err.message.includes("fetch failed")) {
            errorMessage = "No internet connection";
          } else if (err.message.includes("timeout") || err.message.includes("ETIMEDOUT")) {
            errorMessage = "Connection timeout";
          } else if (err.message.includes("503") || err.message.includes("502")) {
            errorMessage = "API temporarily unavailable";
          } else {
            errorMessage = err.message;
          }
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Format single stat based on text format preference
  function formatStat(value: number, type: "views" | "comments"): string {
    const num = formatNumber(value);
    switch (preferences.statsTextFormat) {
      case "shortest":
        return type === "views" ? `${num}v` : `${num}c`;
      case "short":
        return type === "views" ? `${num} views` : `${num} comms`;
      case "full":
        return type === "views" ? `${num} views` : `${num} comments`;
      default:
        return type === "views" ? `${num}v` : `${num}c`;
    }
  }

  // Format stats based on preferences (for menu bar title)
  function formatStats(views: number, comments: number): string {
    const parts: string[] = [];
    if (preferences.showPostViews) {
      parts.push(formatStat(views, "views"));
    }
    if (preferences.showPostComments) {
      parts.push(formatStat(comments, "comments"));
    }
    return parts.length > 0 ? parts.join(" · ") : formatNumber(views) + "v";
  }

  // Calculate rotation index based on current time
  function getRotationIndex(postsCount: number): number {
    if (rotationInterval === 0 || postsCount <= 1) return 0;

    // Calculate index based on time: floor(currentMinutes / interval) % postsCount
    const now = new Date();
    const minutesSinceEpoch = Math.floor(now.getTime() / 60000);
    const cycleIndex = Math.floor(minutesSinceEpoch / rotationInterval);
    return cycleIndex % postsCount;
  }

  // Get menu bar title based on preferences
  function getMenuBarTitle(): string | undefined {
    if (preferences.menuBarDisplayMode === "icon") {
      return undefined;
    }

    let sourcePosts: DisplayPost[] = [];
    switch (preferences.menuBarTitleSource) {
      case "news":
        sourcePosts = newsPosts;
        break;
      case "popular":
        sourcePosts = popularPosts;
        break;
      case "latest":
        sourcePosts = latestPosts;
        break;
    }

    if (sourcePosts.length === 0) return undefined;

    // Use rotation index if rotation is enabled, otherwise always first post
    const postIndex = getRotationIndex(sourcePosts.length);
    const post = sourcePosts[postIndex];

    switch (preferences.menuBarDisplayMode) {
      case "count":
        return `${sourcePosts.length}`;
      case "title":
        return truncateText(post.title, menuBarTitleMaxLength);
      case "stats":
        return formatStats(post.stats.views, post.stats.comments);
      default:
        return undefined;
    }
  }

  // Format post subtitle based on preferences
  // Order: Category, Author, Views, Comments, Date
  function getPostSubtitle(post: DisplayPost): string | undefined {
    const parts: string[] = [];

    if (preferences.showPostCategory && post.subsite.name) {
      parts.push(post.subsite.name);
    }
    if (preferences.showPostAuthors) {
      parts.push(post.author.name);
    }
    if (preferences.showPostViews) {
      parts.push(formatStat(post.stats.views, "views"));
    }
    if (preferences.showPostComments) {
      parts.push(formatStat(post.stats.comments, "comments"));
    }
    if (preferences.showPostTime) {
      parts.push(formatRelativeDateShort(post.date));
    }

    return parts.length > 0 ? parts.join(" · ") : undefined;
  }

  // Format post title based on preferences
  function getPostTitle(post: DisplayPost): string {
    if (preferences.compactTitles) {
      return truncateText(post.title, titleMaxLength);
    }
    return post.title;
  }

  // Handle post action
  async function handlePostAction(post: DisplayPost) {
    if (preferences.primaryAction === "copy") {
      await Clipboard.copy(post.url);
      await showHUD("URL copied to clipboard");
    } else {
      // Both "browser" and "raycast" open the post URL
      // (Raycast can't deep-link to a specific post, so we open in browser)
      await open(post.url);
    }
  }

  // Get tooltip for post (full title + excerpt)
  function getPostTooltip(post: DisplayPost): string {
    const parts = [post.title];
    if (post.excerpt) {
      parts.push(post.excerpt);
    }
    return parts.join("\n\n");
  }

  // Render post item
  function renderPostItem(post: DisplayPost, key: string) {
    return (
      <MenuBarExtra.Item
        key={key}
        icon={preferences.showPostIcons ? getPostIcon(post) : undefined}
        title={getPostTitle(post)}
        subtitle={getPostSubtitle(post)}
        tooltip={getPostTooltip(post)}
        onAction={() => handlePostAction(post)}
      />
    );
  }

  // Format last update time for tooltip
  function getRefreshTooltip(): string {
    if (!lastUpdate) return "Refresh";
    const timeAgo = formatRelativeDateShort(lastUpdate);
    return `Refresh • Last updated ${timeAgo}`;
  }

  // Check if any section is enabled
  const hasAnySectionEnabled =
    preferences.showNewsSection ||
    preferences.showPopularSection ||
    preferences.showFreshSection ||
    preferences.showLatestSection ||
    preferences.showTopicsSection ||
    preferences.showTopBlogsSection;

  // If no sections enabled, show a message
  if (!hasAnySectionEnabled && !isLoading) {
    return (
      <MenuBarExtra icon={getMenuBarIcon()} tooltip="DTF">
        <MenuBarExtra.Item title="No sections enabled" />
        <MenuBarExtra.Item
          title="Open Extension Preferences"
          onAction={() => {
            open("raycast://extensions/Shadeov/dtf/menu-bar");
          }}
        />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon={getMenuBarIcon()} title={getMenuBarTitle()} tooltip="DTF" isLoading={isLoading}>
      {/* News Section */}
      {preferences.showNewsSection && newsPosts.length > 0 && (
        <MenuBarExtra.Section title="News">
          {newsPosts.map((post) => renderPostItem(post, `news-${post.id}`))}
        </MenuBarExtra.Section>
      )}

      {/* Popular Section */}
      {preferences.showPopularSection && popularPosts.length > 0 && (
        <MenuBarExtra.Section title="Popular">
          {popularPosts.map((post) => renderPostItem(post, `popular-${post.id}`))}
        </MenuBarExtra.Section>
      )}

      {/* Fresh Section */}
      {preferences.showFreshSection && freshPosts.length > 0 && (
        <MenuBarExtra.Section title="Fresh">
          {freshPosts.map((post) => renderPostItem(post, `fresh-${post.id}`))}
        </MenuBarExtra.Section>
      )}

      {/* Latest Section */}
      {preferences.showLatestSection && latestPosts.length > 0 && (
        <MenuBarExtra.Section title="Latest">
          {latestPosts.map((post) => renderPostItem(post, `latest-${post.id}`))}
        </MenuBarExtra.Section>
      )}

      {/* Topics Section */}
      {preferences.showTopicsSection && topicsWithPosts.length > 0 && (
        <MenuBarExtra.Section title="Topics">
          {topicsWithPosts.map((topicData) => (
            <MenuBarExtra.Submenu
              key={`topic-${topicData.topic.id}`}
              title={topicData.topic.name}
              icon={getTopicIcon(topicData.topic)}
            >
              {/* Topic description */}
              {topicData.topic.description && (
                <MenuBarExtra.Section>
                  <MenuBarExtra.Item title={truncateText(topicData.topic.description, 60)} />
                </MenuBarExtra.Section>
              )}

              {/* Posts */}
              <MenuBarExtra.Section>
                {topicData.posts.length > 0 ? (
                  topicData.posts.map((post) => renderPostItem(post, `topic-${topicData.topic.id}-${post.id}`))
                ) : (
                  <MenuBarExtra.Item title="No posts" />
                )}
              </MenuBarExtra.Section>

              {/* Open topic button */}
              <MenuBarExtra.Section>
                <MenuBarExtra.Item
                  title={`Open ${topicData.topic.name}`}
                  icon={getTopicIcon(topicData.topic)}
                  onAction={() => open(topicData.topic.url)}
                />
              </MenuBarExtra.Section>
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}

      {/* Top Blogs Section */}
      {preferences.showTopBlogsSection && topBlogsWithPosts.length > 0 && (
        <MenuBarExtra.Section title="Top Blogs">
          {topBlogsWithPosts.map((blogData) => (
            <MenuBarExtra.Submenu
              key={`blog-${blogData.blog.id}`}
              title={blogData.blog.name}
              icon={getBlogIcon(blogData.blog)}
            >
              {/* Blog description */}
              {blogData.blog.description && (
                <MenuBarExtra.Section>
                  <MenuBarExtra.Item title={truncateText(blogData.blog.description, 60)} />
                </MenuBarExtra.Section>
              )}

              {/* Posts */}
              <MenuBarExtra.Section>
                {blogData.posts.length > 0 ? (
                  blogData.posts.map((post) => renderPostItem(post, `blog-${blogData.blog.id}-${post.id}`))
                ) : (
                  <MenuBarExtra.Item title="No posts" />
                )}
              </MenuBarExtra.Section>

              {/* Open blog button */}
              <MenuBarExtra.Section>
                <MenuBarExtra.Item
                  title={`Open ${blogData.blog.name}`}
                  icon={getBlogIcon(blogData.blog)}
                  onAction={() => open(blogData.blog.url)}
                />
              </MenuBarExtra.Section>
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}

      {/* Error Section */}
      {error && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={Icon.Warning}
            title={error}
            tooltip="Click to retry"
            onAction={async () => {
              try {
                await launchCommand({
                  name: "menu-bar",
                  type: LaunchType.UserInitiated,
                });
              } catch (error) {
                await showFailureToast(error, { title: "Failed to refresh menu bar" });
              }
            }}
          />
        </MenuBarExtra.Section>
      )}

      {/* More Section */}
      {preferences.showMoreSection && (
        <MenuBarExtra.Section title="More">
          <MenuBarExtra.Item
            title="Popular"
            icon={Icon.Star}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "popular-posts",
                  type: LaunchType.UserInitiated,
                });
              } catch (error) {
                await showFailureToast(error, { title: "Failed to open Popular Posts" });
              }
            }}
          />
          <MenuBarExtra.Item
            title="Fresh"
            icon={Icon.Clock}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "fresh-posts",
                  type: LaunchType.UserInitiated,
                });
              } catch (error) {
                await showFailureToast(error, { title: "Failed to open Fresh Posts" });
              }
            }}
          />
          <MenuBarExtra.Item
            title="News"
            icon={Icon.Megaphone}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "news",
                  type: LaunchType.UserInitiated,
                });
              } catch (error) {
                await showFailureToast(error, { title: "Failed to open News" });
              }
            }}
          />
          <MenuBarExtra.Item
            title="Topics"
            icon={Icon.Tag}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "browse-subsites",
                  type: LaunchType.UserInitiated,
                });
              } catch (error) {
                await showFailureToast(error, { title: "Failed to open Topics" });
              }
            }}
          />
          <MenuBarExtra.Item
            title="Top Blogs"
            icon={Icon.Trophy}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "top-blogs",
                  type: LaunchType.UserInitiated,
                });
              } catch (error) {
                await showFailureToast(error, { title: "Failed to open Top Blogs" });
              }
            }}
          />
        </MenuBarExtra.Section>
      )}

      {/* Actions Section */}
      {(preferences.showOpenDTFAction || preferences.showRefreshAction || preferences.showSearchAction) && (
        <MenuBarExtra.Section>
          {preferences.showSearchAction && (
            <MenuBarExtra.Item
              title="Search Posts..."
              icon={Icon.MagnifyingGlass}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "f" },
                Windows: { modifiers: ["ctrl"], key: "f" },
              }}
              onAction={async () => {
                try {
                  await launchCommand({
                    name: "search-posts",
                    type: LaunchType.UserInitiated,
                  });
                } catch (error) {
                  await showFailureToast(error, { title: "Failed to open Search Posts" });
                }
              }}
            />
          )}
          {preferences.showOpenDTFAction && (
            <MenuBarExtra.Item
              title="Open DTF"
              icon={getMenuBarIcon()}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() => open("https://dtf.ru")}
            />
          )}
          {preferences.showRefreshAction && (
            <MenuBarExtra.Item
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              tooltip={getRefreshTooltip()}
              onAction={async () => {
                try {
                  await launchCommand({
                    name: "menu-bar",
                    type: LaunchType.UserInitiated,
                  });
                } catch (error) {
                  await showFailureToast(error, { title: "Failed to refresh menu bar" });
                }
              }}
            />
          )}
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
