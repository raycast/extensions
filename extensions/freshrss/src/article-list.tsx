import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Article } from "./api";
import ArticleDetail from "./article-detail";

export function cleanTitle(title: string): string {
  return title
    .replace(/\uFFFC/g, "")
    .replace(
      /^(?:(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)|(?:\p{Regional_Indicator}{2})|(?:[#*0-9]\uFE0F?\u20E3))+\s*/u,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const d = new Date(ts * 1000);
  return `${d.toLocaleString("en", { month: "short" })} ${d.getDate()}`;
}

function formatSourceTitle(value?: string): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/\s*-\s*Telegram Channel$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSourceTitle(value?: string): string | undefined {
  const normalized = formatSourceTitle(value);
  if (!normalized) return undefined;
  const primarySegment = normalized.split(/\s+[•|/]\s+|\s+[—-]\s+/)[0]?.trim() || normalized;
  return primarySegment;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export type StatusFilter = "all" | "unread" | "starred";
export type PeriodFilter = "today" | "week" | "month" | "all_time";

const STATUS_OPTIONS = [
  { id: "unread", name: "Unread", icon: Icon.CircleFilled },
  { id: "starred", name: "Starred", icon: Icon.Star },
  { id: "all", name: "All", icon: Icon.Document },
] as const;

const PERIOD_OPTIONS = [
  { id: "all_time", name: "All Time" },
  { id: "today", name: "Today" },
  { id: "week", name: "Last 7 Days" },
  { id: "month", name: "Last 30 Days" },
] as const;

function getDefaultNavigationTitle(statusFilter: StatusFilter, periodFilter: PeriodFilter): string {
  if (statusFilter === "starred") return "Starred Articles";
  if (statusFilter === "unread" && periodFilter === "today") {
    return "Today's Articles";
  }
  if (statusFilter === "unread") return "Browse Articles";
  return "Articles";
}

function getOldestTimestamp(period: PeriodFilter): number | undefined {
  const now = Math.floor(Date.now() / 1000);
  switch (period) {
    case "today": {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return Math.floor(start.getTime() / 1000);
    }
    case "week":
      return now - 7 * 24 * 60 * 60;
    case "month":
      return now - 30 * 24 * 60 * 60;
    default:
      return undefined;
  }
}

interface ArticleListProps {
  initialStatus?: StatusFilter;
  initialPeriod?: PeriodFilter;
  lockStatus?: boolean;
  lockPeriod?: boolean;
  streamId?: string;
  streamTitle?: string;
}

export default function ArticleList({
  initialStatus = "unread",
  initialPeriod = "all_time",
  lockStatus = false,
  lockPeriod = false,
  streamId,
  streamTitle,
}: ArticleListProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [continuation, setContinuation] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(initialPeriod);
  const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(null);

  const requestIdRef = useRef(0);

  const updateArticle = useCallback((articleId: string, updater: (article: Article) => Article) => {
    setArticles((prev) => prev.map((article) => (article.id === articleId ? updater(article) : article)));
  }, []);

  const loadArticles = useCallback(
    async (text: string, contToken?: string) => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;
      setIsLoading(true);

      try {
        let stream = streamId ?? "user/-/state/com.google/reading-list";
        if (!streamId && statusFilter === "starred") {
          stream = "user/-/state/com.google/starred";
        }

        if (text.trim()) {
          if (!contToken) {
            setContinuation(undefined);
          }
          const response = await api.searchWeb(text.trim(), {
            stream,
            continuation: contToken,
            count: 50,
            excludeTag: statusFilter === "unread" ? "user/-/state/com.google/read" : undefined,
            includeTag: statusFilter === "starred" && streamId ? "user/-/state/com.google/starred" : undefined,
            since: getOldestTimestamp(periodFilter),
          });
          if (requestId !== requestIdRef.current) return;
          setArticles((prev) => (contToken ? [...prev, ...response.items] : response.items));
          setContinuation(response.continuation);
        } else {
          const response = await api.getStream(stream, {
            continuation: contToken,
            count: 50,
            excludeTag: statusFilter === "unread" ? "user/-/state/com.google/read" : undefined,
            includeTag: statusFilter === "starred" && streamId ? "user/-/state/com.google/starred" : undefined,
            since: getOldestTimestamp(periodFilter),
          });
          if (requestId !== requestIdRef.current) return;
          setArticles((prev) => (contToken ? [...prev, ...response.items] : response.items));
          setContinuation(response.continuation);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: String(e),
          });
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [statusFilter, periodFilter, streamId],
  );

  useEffect(() => {
    loadArticles(searchText);
  }, [searchText, loadArticles]);

  useEffect(() => {
    const canUseServerUnreadCount = !searchText.trim() && statusFilter === "unread" && periodFilter === "all_time";

    if (!canUseServerUnreadCount) {
      setServerUnreadCount(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const counts = await api.getUnreadCounts();
        if (cancelled) return;

        const stream = streamId ?? "user/-/state/com.google/reading-list";
        const matchedCount = counts.find((entry) => entry.id === stream)?.count ?? 0;
        setServerUnreadCount(matchedCount);
      } catch {
        if (!cancelled) {
          setServerUnreadCount(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchText, statusFilter, periodFilter, streamId]);

  const combinedValue = `${statusFilter}:::${periodFilter}`;
  const showEmptyView = !isLoading && articles.length === 0;
  const showLoadingRow = isLoading && articles.length === 0 && searchText.trim().length > 0;

  const isNestedScreen = Boolean(streamId || streamTitle);
  const baseNavigationTitle = streamTitle ?? getDefaultNavigationTitle(statusFilter, periodFilter);
  const navigationTitle =
    statusFilter === "unread" && serverUnreadCount !== null
      ? `${baseNavigationTitle} • ${serverUnreadCount} unread`
      : baseNavigationTitle;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search articles..."
      throttle={true}
      filtering={false}
      searchText={searchText}
      navigationTitle={isNestedScreen ? navigationTitle : undefined}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Articles"
          value={combinedValue}
          onChange={(newValue) => {
            const [newStatus, newPeriod] = newValue.split(":::");
            if (!lockStatus) setStatusFilter(newStatus as StatusFilter);
            if (!lockPeriod) setPeriodFilter(newPeriod as PeriodFilter);
          }}
        >
          {STATUS_OPTIONS.map((status) => (
            <List.Dropdown.Section key={status.id} title={status.name}>
              {PERIOD_OPTIONS.map((period) => (
                <List.Dropdown.Item
                  key={`${status.id}:::${period.id}`}
                  value={`${status.id}:::${period.id}`}
                  title={`${status.name} • ${period.name}`}
                  icon={status.icon}
                />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
      pagination={{
        pageSize: 50,
        hasMore: !!continuation,
        onLoadMore: () => loadArticles(searchText, continuation),
      }}
    >
      {showLoadingRow ? (
        <List.Item
          id="loading-search"
          title="Searching…"
          subtitle="Fetching results from FreshRSS"
          icon={Icon.MagnifyingGlass}
        />
      ) : null}
      {showEmptyView ? (
        <List.EmptyView
          title={searchText.trim() ? "No Results" : "No Articles"}
          description={
            searchText.trim() ? "Nothing matched your search." : "There are no articles for the selected filters."
          }
        />
      ) : null}
      {articles.map((article) => {
        const isRead = article.categories.some((c) => c.endsWith("/read"));
        const isStarred = article.categories.some((c) => c.endsWith("/starred"));
        const sourceTitle = formatSourceTitle(article.origin?.title);
        const compactSource = compactSourceTitle(article.origin?.title);
        const cleanedTitle = cleanTitle(article.title) || "Untitled";
        const compactTitle = truncateText(cleanedTitle, 72);
        const compactSourceLabel = compactSource ? truncateText(compactSource, 16) : undefined;
        const relativeTime = formatRelativeTime(article.published);
        const absoluteTime = article.published ? new Date(article.published * 1000).toLocaleString() : undefined;

        return (
          <List.Item
            key={article.id}
            id={article.id}
            icon={{
              source: isRead ? Icon.Circle : Icon.CircleFilled,
              tintColor: isRead ? Color.SecondaryText : Color.Blue,
            }}
            title={compactTitle}
            accessories={
              [
                compactSourceLabel
                  ? {
                      text: {
                        value: compactSourceLabel,
                        color: Color.SecondaryText,
                      },
                      tooltip: sourceTitle,
                    }
                  : null,
                {
                  text: {
                    value: relativeTime,
                    color: Color.SecondaryText,
                  },
                  tooltip: absoluteTime,
                },
                {
                  icon: isStarred
                    ? { source: Icon.Star, tintColor: Color.Yellow }
                    : { source: Icon.Star, tintColor: Color.SecondaryText },
                  tooltip: isStarred ? "Starred" : "Not starred",
                },
              ].filter(Boolean) as List.Item.Accessory[]
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Read Article"
                  target={
                    <ArticleDetail
                      article={article}
                      onToggleRead={(targetArticle, markRead) => {
                        updateArticle(targetArticle.id, (currentArticle) => ({
                          ...currentArticle,
                          categories: markRead
                            ? [
                                ...currentArticle.categories.filter(
                                  (category) => category !== "user/-/state/com.google/read",
                                ),
                                "user/-/state/com.google/read",
                              ]
                            : currentArticle.categories.filter(
                                (category) => category !== "user/-/state/com.google/read",
                              ),
                        }));
                      }}
                      onToggleStar={(targetArticle, markStarred) => {
                        updateArticle(targetArticle.id, (currentArticle) => ({
                          ...currentArticle,
                          categories: markStarred
                            ? [
                                ...currentArticle.categories.filter(
                                  (category) => category !== "user/-/state/com.google/starred",
                                ),
                                "user/-/state/com.google/starred",
                              ]
                            : currentArticle.categories.filter(
                                (category) => category !== "user/-/state/com.google/starred",
                              ),
                        }));
                      }}
                    />
                  }
                />
                <Action
                  title={isRead ? "Mark as Unread" : "Mark as Read"}
                  icon={isRead ? Icon.Circle : Icon.CheckCircle}
                  onAction={async () => {
                    try {
                      if (isRead) {
                        await api.markAsUnread(article.id);
                      } else {
                        await api.markAsRead(article.id);
                      }
                      updateArticle(article.id, (currentArticle) => ({
                        ...currentArticle,
                        categories: isRead
                          ? currentArticle.categories.filter((category) => category !== "user/-/state/com.google/read")
                          : [
                              ...currentArticle.categories.filter(
                                (category) => category !== "user/-/state/com.google/read",
                              ),
                              "user/-/state/com.google/read",
                            ],
                      }));
                    } catch (err) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Failed",
                        message: err instanceof Error ? err.message : String(err),
                      });
                    }
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action
                  title={isStarred ? "Unstar" : "Star"}
                  icon={Icon.Star}
                  onAction={async () => {
                    try {
                      if (isStarred) {
                        await api.unstar(article.id);
                      } else {
                        await api.star(article.id);
                      }
                      updateArticle(article.id, (currentArticle) => ({
                        ...currentArticle,
                        categories: isStarred
                          ? currentArticle.categories.filter(
                              (category) => category !== "user/-/state/com.google/starred",
                            )
                          : [
                              ...currentArticle.categories.filter(
                                (category) => category !== "user/-/state/com.google/starred",
                              ),
                              "user/-/state/com.google/starred",
                            ],
                      }));
                    } catch (err) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Failed",
                        message: err instanceof Error ? err.message : String(err),
                      });
                    }
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
