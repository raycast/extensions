/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React, { useState, useEffect } from "react";
import { ActionPanel, Action, List, showToast, Toast, Icon, LocalStorage } from "@raycast/api";

interface RedditPost {
  id: string;
  title: string;
  score: number;
  num_comments: number;
  subreddit: string;
  permalink: string;
  url: string;
}

// Time range options
const TIME_RANGE_OPTIONS = [
  { title: "Today", value: "day" },
  { title: "This Week", value: "week" },
  { title: "This Month", value: "month" },
  { title: "This Year", value: "year" },
  { title: "All Time", value: "all" },
];

export default function Command() {
  // Default values
  const defaultSubreddit = "LandscapePhotography";
  const defaultTimeRange = "day";

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [error, setError] = useState<Error | undefined>();
  const [searchText, setSearchText] = useState("");

  // Current subreddit and time range
  const [subreddit, setSubreddit] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [isTypingSubreddit, setIsTypingSubreddit] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Load settings and history on startup
  useEffect(() => {
    async function loadSavedSettings() {
      try {
        // Load last used subreddit and time range
        const savedSubreddit = await LocalStorage.getItem<string>("lastSubreddit");
        const savedTimeRange = await LocalStorage.getItem<string>("lastTimeRange");
        const savedHistory = await LocalStorage.getItem<string>("subredditHistory");

        // Set initial values
        const initialSubreddit = savedSubreddit || defaultSubreddit;
        const initialTimeRange = savedTimeRange || defaultTimeRange;

        setSubreddit(initialSubreddit);
        setTimeRange(initialTimeRange);

        // Load history
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }

        // Initial fetch
        fetchPosts(initialSubreddit, initialTimeRange);
      } catch (error) {
        console.error("Failed to load settings:", error);
        // Fallback to defaults
        setSubreddit(defaultSubreddit);
        setTimeRange(defaultTimeRange);
        fetchPosts(defaultSubreddit, defaultTimeRange);
      }
    }

    loadSavedSettings();
  }, []);

  // Function to add subreddit to history
  async function addToHistory(subredditName: string) {
    // Ignore default built-in options
    if (subredditName === "LandscapePhotography" || subredditName === "popular") {
      return;
    }

    try {
      // Add to front and ensure no duplicates
      const updatedHistory = [subredditName, ...history.filter((item: string) => item !== subredditName)].slice(0, 5); // Limit to 5 items

      setHistory(updatedHistory);
      await LocalStorage.setItem("subredditHistory", JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  }

  // Function to remove from history
  async function removeFromHistory(subredditName: string) {
    try {
      const updatedHistory = history.filter((item: string) => item !== subredditName);
      setHistory(updatedHistory);
      await LocalStorage.setItem("subredditHistory", JSON.stringify(updatedHistory));

      showToast({
        style: Toast.Style.Success,
        title: `Removed r/${subredditName} from history`,
      });
    } catch (error) {
      console.error("Failed to update history:", error);
    }
  }

  // Function to load posts
  async function fetchPosts(subredditName: string, timeRangeValue: string) {
    if (!subredditName) return;

    setIsLoading(true);
    setError(undefined);
    // Clear the search text when loading a new subreddit
    setSearchText("");
    setIsTypingSubreddit(false);

    try {
      const url = `https://www.reddit.com/r/${subredditName}/top/.json?t=${timeRangeValue}&limit=25`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Raycast Reddit Trends Extension",
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      interface RedditApiResponse {
        data: {
          children: Array<{
            data: {
              id: string;
              title: string;
              score: number;
              num_comments: number;
              subreddit: string;
              permalink: string;
              url: string;
            };
          }>;
        };
      }

      const data = (await response.json()) as RedditApiResponse;

      if (!data.data?.children?.length) {
        throw new Error(`No posts found for r/${subredditName}`);
      }

      const redditPosts = data.data.children.map((child) => {
        const post = child.data;
        return {
          id: post.id,
          title: post.title,
          score: post.score,
          num_comments: post.num_comments,
          subreddit: post.subreddit,
          permalink: post.permalink,
          url: post.url,
        };
      });

      setPosts(redditPosts);
      setSubreddit(subredditName);
      setTimeRange(timeRangeValue);

      // Save current settings
      await LocalStorage.setItem("lastSubreddit", subredditName);
      await LocalStorage.setItem("lastTimeRange", timeRangeValue);

      // Add to history
      await addToHistory(subredditName);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error : new Error("Something went wrong"));
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Show error toast
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load Reddit posts",
        message: error.message,
      });
    }
  }, [error]);

  // Handle search text changes - either filtering posts or typing a subreddit
  function handleSearchTextChange(text: string) {
    if (isTypingSubreddit) {
      // Keep the text as-is when typing a subreddit
      setSearchText(text);
    } else {
      // When searching in posts, use lowercase for better matching
      setSearchText(text.toLowerCase());
    }
  }

  // Handle subreddit submission
  function submitCustomSubreddit() {
    if (isTypingSubreddit && searchText.trim()) {
      fetchPosts(searchText.trim(), timeRange);

      showToast({
        style: Toast.Style.Success,
        title: `Loading r/${searchText.trim()}`,
      });
    }
  }

  // Toggle between post search and subreddit entry
  function toggleSubredditTyping() {
    setIsTypingSubreddit(!isTypingSubreddit);
    setSearchText("");
  }

  // Filter posts by search text when not in subreddit typing mode
  const filteredPosts =
    !isTypingSubreddit && searchText
      ? posts.filter((post: RedditPost) => post.title.toLowerCase().includes(searchText))
      : posts;

  // Get current time range title
  const timeRangeTitle = TIME_RANGE_OPTIONS.find((opt) => opt.value === timeRange)?.title || "Today";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={isTypingSubreddit ? "Enter subreddit name and press Enter..." : "Search in posts..."}
      onSearchTextChange={handleSearchTextChange}
      searchText={searchText}
      navigationTitle={`Reddit Trends - r/${subreddit}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Range"
          value={timeRange}
          onChange={(value: string) => fetchPosts(subreddit, value)}
        >
          {TIME_RANGE_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Subreddits">
        {isTypingSubreddit ? (
          // Custom subreddit input mode
          <List.Item
            title={searchText ? `Load r/${searchText}` : "Type a subreddit name"}
            icon={Icon.PlusCircle}
            actions={
              <ActionPanel>
                <Action
                  title="Load Subreddit"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={submitCustomSubreddit}
                />
                <Action
                  title="Cancel"
                  icon={Icon.XmarkCircle}
                  onAction={() => {
                    setIsTypingSubreddit(false);
                    setSearchText("");
                  }}
                />
              </ActionPanel>
            }
          />
        ) : (
          // Default List Mode
          <>
            {/* Custom Subreddit Option */}
            <List.Item
              title="Enter Custom Subreddit"
              icon={Icon.TextCursor}
              actions={
                <ActionPanel>
                  <Action
                    title="Enter Subreddit Name"
                    icon={Icon.TextInput}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={toggleSubredditTyping}
                  />
                </ActionPanel>
              }
            />

            {/* Default Options */}
            <List.Item
              title={
                subreddit === "LandscapePhotography" ? "r/LandscapePhotography (Current)" : "r/LandscapePhotography"
              }
              subtitle="Beautiful landscape photography"
              icon={subreddit === "LandscapePhotography" ? Icon.Checkmark : Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title="Load r/LandscapePhotography"
                    onAction={() => fetchPosts("LandscapePhotography", timeRange)}
                  />
                </ActionPanel>
              }
            />

            <List.Item
              title={subreddit === "popular" ? "r/popular (Current)" : "r/popular"}
              subtitle="Reddit's default homepage"
              icon={subreddit === "popular" ? Icon.Checkmark : Icon.Circle}
              actions={
                <ActionPanel>
                  <Action title="Load r/Popular" onAction={() => fetchPosts("popular", timeRange)} />
                </ActionPanel>
              }
            />

            {/* History Items */}
            {history.map((item: string) => (
              <List.Item
                key={item}
                title={subreddit === item ? `r/${item} (Current)` : `r/${item}`}
                icon={subreddit === item ? Icon.Checkmark : Icon.Clock}
                accessories={[
                  {
                    icon: Icon.Trash,
                    tooltip: "Remove from history",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action title={`Load r/${item}`} onAction={() => fetchPosts(item, timeRange)} />
                    <Action title="Remove From History" icon={Icon.Trash} onAction={() => removeFromHistory(item)} />
                  </ActionPanel>
                }
              />
            ))}
          </>
        )}
      </List.Section>

      {filteredPosts.length > 0 && !isTypingSubreddit && (
        <List.Section title={`Trending on r/${subreddit} - ${timeRangeTitle}`}>
          {filteredPosts.map((post: RedditPost) => (
            <List.Item
              key={post.id}
              title={post.title}
              subtitle={`r/${post.subreddit}`}
              accessories={[
                { text: `↑ ${formatNumber(post.score)}` },
                { text: `💬 ${formatNumber(post.num_comments)}` },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://reddit.com${post.permalink}`} title="Open Post" />
                  {post.url && <Action.OpenInBrowser url={post.url} title="Open Content URL" />}
                  <Action.CopyToClipboard content={`https://reddit.com${post.permalink}`} title="Copy Link" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!isLoading && filteredPosts.length === 0 && !isTypingSubreddit && (
        <List.EmptyView
          title={error ? `Error loading r/${subreddit}` : `No posts found for r/${subreddit}`}
          description={error ? error.message : "Try changing the subreddit or time range"}
        />
      )}
    </List>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "m";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}
