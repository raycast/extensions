import { List, ActionPanel, Action, Icon, Color, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { getRedmineUrl } from "./utils/config";

// Redmine 配置
// const REDMINE_BASE_URL = "http://192.168.110.8:8084";
const REDMINE_BASE_URL = getRedmineUrl();

const REDMINE_SEARCH_URL = `${REDMINE_BASE_URL}/search?utf8=%E2%9C%93&q=`;

// 搜索历史接口
interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 加载搜索历史
  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const stored = await LocalStorage.getItem<string>("redmine-search-history");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed as SearchHistory[]);
        }
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }

  async function saveToHistory(query: string) {
    if (!query.trim()) return;

    const newEntry: SearchHistory = {
      id: Date.now().toString(),
      query: query.trim(),
      timestamp: Date.now(),
    };

    // 去重
    const filtered = history.filter((item) => item.query !== query.trim());
    const newHistory = [newEntry, ...filtered].slice(0, 20); // 保留最近 20 条

    setHistory(newHistory);

    try {
      await LocalStorage.setItem("redmine-search-history", JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  }

  async function clearHistory() {
    setHistory([]);
    await LocalStorage.removeItem("redmine-search-history");
  }

  function handleSearch(query: string) {
    saveToHistory(query);
  }

  // 构建完整的搜索 URL
  const searchUrl = searchText.trim()
    ? `${REDMINE_SEARCH_URL}${encodeURIComponent(searchText.trim())}`
    : REDMINE_BASE_URL;

  // 快捷链接配置
  const quickLinks = [
    {
      title: "Redmine Home",
      url: REDMINE_BASE_URL,
      icon: Icon.House,
      color: Color.Green,
      subtitle: "Go to home page",
    },
    {
      title: "My Page",
      url: `${REDMINE_BASE_URL}/my/page`,
      icon: Icon.Person,
      color: Color.Purple,
      subtitle: "Personal dashboard",
    },
    {
      title: "Projects",
      url: `${REDMINE_BASE_URL}/projects`,
      icon: Icon.Folder,
      color: Color.Orange,
      subtitle: "View all projects",
    },
    {
      title: "Issues",
      url: `${REDMINE_BASE_URL}/issues`,
      icon: Icon.Bug,
      color: Color.Red,
      subtitle: "View all issues",
    },
    {
      title: "Activity",
      url: `${REDMINE_BASE_URL}/activity`,
      icon: Icon.Clock,
      color: Color.Blue,
      subtitle: "Recent activity",
    },
    {
      title: "Time Tracking",
      url: `${REDMINE_BASE_URL}/time_entries`,
      icon: Icon.Stopwatch,
      color: Color.Yellow,
      subtitle: "Time entries",
    },
    {
      title: "Calendar",
      url: `${REDMINE_BASE_URL}/issues/calendar`,
      icon: Icon.Calendar,
      color: Color.Magenta,
      subtitle: "Issues calendar",
    },
    {
      title: "Gantt Chart",
      url: `${REDMINE_BASE_URL}/issues/gantt`,
      icon: Icon.BarChart,
      color: Color.Blue,
      subtitle: "Gantt view",
    },
  ];

  // 历史记录视图
  if (showHistory) {
    return (
      <List navigationTitle="Search History" searchBarPlaceholder="Search in history...">
        <List.Section title={`${history.length} recent searches`}>
          {history.map((item) => (
            <List.Item
              key={item.id}
              title={item.query}
              subtitle={`${REDMINE_SEARCH_URL}${encodeURIComponent(item.query)}`}
              icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
              accessories={[
                {
                  date: new Date(item.timestamp),
                  tooltip: new Date(item.timestamp).toLocaleString(),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Search Again"
                    url={`${REDMINE_SEARCH_URL}${encodeURIComponent(item.query)}`}
                  />
                  <Action
                    title="Use This Query"
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      setSearchText(item.query);
                      setShowHistory(false);
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Query"
                    content={item.query}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Back to Search"
                      icon={Icon.ArrowLeft}
                      onAction={() => setShowHistory(false)}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                    />
                    <Action
                      title="Clear History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={clearHistory}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
        {history.length === 0 && (
          <List.EmptyView
            icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
            title="No Search History"
            description="Your recent searches will appear here"
            actions={
              <ActionPanel>
                <Action title="Back to Search" icon={Icon.ArrowLeft} onAction={() => setShowHistory(false)} />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  // 主搜索视图
  return (
    <List
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Enter search query for Redmine..."
      throttle
    >
      {searchText ? (
        <List.Section title="Search Results">
          <List.Item
            title={`Search for "${searchText}"`}
            subtitle={searchUrl}
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
            accessories={[
              {
                text: "Press Enter",
                icon: Icon.ArrowRight,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Search in Redmine"
                  url={searchUrl}
                  icon={Icon.Globe}
                  onOpen={() => handleSearch(searchText)}
                />
                <Action.CopyToClipboard
                  title="Copy Search URL"
                  content={searchUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <ActionPanel.Section>
                  <Action
                    title="View History"
                    icon={Icon.Clock}
                    onAction={() => setShowHistory(true)}
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                  <Action.OpenInBrowser
                    title="Open Redmine Home"
                    url={REDMINE_BASE_URL}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          title="Search Redmine"
          description="Type your search query and press Enter"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Redmine Home" url={REDMINE_BASE_URL} icon={Icon.Globe} />
              <Action
                title="View History"
                icon={Icon.Clock}
                onAction={() => setShowHistory(true)}
                shortcut={{ modifiers: ["cmd"], key: "h" }}
              />
            </ActionPanel>
          }
        />
      )}

      {/* 快捷链接 */}
      <List.Section title="Quick Links">
        {quickLinks.map((link) => (
          <List.Item
            key={link.url}
            title={link.title}
            subtitle={link.subtitle}
            icon={{ source: link.icon, tintColor: link.color }}
            accessories={[{ text: link.url }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title={`Open ${link.title}`} url={link.url} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={link.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {/* 搜索历史预览 */}
      {history.length > 0 && !searchText && (
        <List.Section title="Recent Searches">
          {history.slice(0, 5).map((item) => (
            <List.Item
              key={item.id}
              title={item.query}
              icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
              accessories={[
                {
                  date: new Date(item.timestamp),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Search Again"
                    url={`${REDMINE_SEARCH_URL}${encodeURIComponent(item.query)}`}
                    onOpen={() => handleSearch(item.query)}
                  />
                  <Action title="Use This Query" icon={Icon.ArrowRight} onAction={() => setSearchText(item.query)} />
                  <Action
                    title="View All History"
                    icon={Icon.Clock}
                    onAction={() => setShowHistory(true)}
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
