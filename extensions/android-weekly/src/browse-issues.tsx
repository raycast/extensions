import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  ARCHIVE_URL,
  formatDate,
  hostOf,
  parseArchive,
  parseArticles,
  toArticleMarkdown,
  toIssueMarkdown,
  type Article,
  type Issue,
} from "./content";

const SECTION_ICON: Record<string, string> = {
  "Articles & Tutorials": "📝",
  "Libraries & Code": "📦",
  News: "📰",
  "Videos & Podcasts": "🎙️",
};

const PAGE_SIZE = 30;

function fetchText(
  url: string,
  onOk: (t: string) => void,
  onErr: (e: string) => void,
) {
  let alive = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: controller.signal,
  })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then((t) => {
      clearTimeout(timer);
      if (alive) onOk(t);
    })
    .catch((e) => {
      clearTimeout(timer);
      if (alive)
        onErr(e?.name === "AbortError" ? "Request timed out" : String(e));
    });
  return () => {
    alive = false;
    clearTimeout(timer);
    controller.abort();
  };
}

function useIssues() {
  const [issues, setIssues] = useState<Issue[]>();
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  useEffect(
    () =>
      fetchText(
        ARCHIVE_URL,
        (html) => {
          const list = parseArchive(html);
          if (!list.length) {
            const msg = "No issues found — the page format may have changed";
            setIssues(undefined);
            setError(msg);
            showToast({
              style: Toast.Style.Failure,
              title: "No issues found",
              message: msg,
            });
          } else {
            setError(undefined);
            setIssues(list);
          }
        },
        (e) => {
          setError(e);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load issues",
            message: e,
          });
        },
      ),
    [retry],
  );
  return {
    issues,
    isLoading: !issues && !error,
    error,
    retry: () => {
      setError(undefined);
      setRetry((r) => r + 1);
    },
  };
}

function useArticles(url: string) {
  const [articles, setArticles] = useState<Article[]>();
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  useEffect(
    () =>
      fetchText(
        url,
        (html) => {
          const list = parseArticles(html);
          if (!list.length) {
            const msg = "No articles found — the page format may have changed";
            setArticles(undefined);
            setError(msg);
            showToast({
              style: Toast.Style.Failure,
              title: "No articles found",
              message: msg,
            });
          } else {
            setError(undefined);
            setArticles(list);
          }
        },
        (e) => {
          setError(e);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load issue",
            message: e,
          });
        },
      ),
    [url, retry],
  );
  return {
    articles,
    isLoading: !articles && !error,
    error,
    retry: () => {
      setError(undefined);
      setRetry((r) => r + 1);
    },
  };
}

function IssueDetail({ issue }: { issue: Issue }) {
  const { articles, isLoading, error, retry } = useArticles(issue.url);
  const { push } = useNavigation();
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={issue.title}
      markdown={
        articles
          ? toIssueMarkdown(issue, articles)
          : error
            ? `# Couldn't load issue\n\n${error}`
            : "Loading…"
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={issue.url} />
          <Action
            title="Browse as List"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            onAction={() => push(<ArticleList issue={issue} />)}
          />
          {error && (
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} />
          )}
          <Action.CopyToClipboard
            title="Copy Issue URL"
            icon={Icon.Clipboard}
            content={issue.url}
          />
        </ActionPanel>
      }
    />
  );
}

function ArticleList({ issue }: { issue: Issue }) {
  const { articles, isLoading, error, retry } = useArticles(issue.url);
  // no side preview — the website shows flowing text; the Detail view is the default screen
  const [showDetail, setShowDetail] = useState(false);
  const { push } = useNavigation();
  const groups = new Map<string, Article[]>();
  for (const a of articles ?? []) {
    const list = groups.get(a.section) ?? [];
    list.push(a);
    groups.set(a.section, list);
  }
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={issue.title}
      searchBarPlaceholder={`Search ${issue.title}...`}
    >
      {error && !articles && (
        <List.EmptyView
          title="Couldn't load issue"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={retry}
              />
            </ActionPanel>
          }
        />
      )}
      {[...groups].map(([section, items]) => (
        <List.Section
          key={section}
          title={`${SECTION_ICON[section] ?? "•"} ${section}`}
          subtitle={`${items.length}`}
        >
          {items.map((a, idx) => (
            <List.Item
              key={`${a.url}::${idx}`}
              title={a.title}
              accessories={[{ text: hostOf(a.url) }]}
              // no subtitle — it shares the row and truncates the title; description lives in the side panel
              detail={
                <List.Item.Detail
                  markdown={toArticleMarkdown(a)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Section"
                        text={section}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Source"
                        text={hostOf(a.url)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Read full article"
                        text={a.title}
                        target={a.url}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={a.url} />
                  <Action
                    title={showDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setShowDetail((v) => !v)}
                  />
                  <Action
                    title="Read Issue"
                    icon={Icon.Document}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    onAction={() => push(<IssueDetail issue={issue} />)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Article URL"
                    icon={Icon.Clipboard}
                    content={a.url}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default function BrowseIssues() {
  const { issues, isLoading, error, retry } = useIssues();
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const q = searchText.toLowerCase();
  const filtered = (issues ?? []).filter(
    (i) =>
      !q ||
      i.title.toLowerCase().includes(q) ||
      i.number.includes(q) ||
      formatDate(i.date).toLowerCase().includes(q),
  );
  const visible = filtered.slice(0, shown);
  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={(t) => {
        setSearchText(t);
        setShown(PAGE_SIZE);
      }}
      searchBarPlaceholder={
        issues ? `Search ${issues.length} issues...` : "Search issues..."
      }
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: shown < filtered.length,
        onLoadMore: () => setShown((s) => s + PAGE_SIZE),
      }}
    >
      {error && !issues && (
        <List.EmptyView
          title="Couldn't load issues"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={retry}
              />
            </ActionPanel>
          }
        />
      )}
      {visible.map((issue, i) => (
        <List.Item
          key={`${issue.url}::${i}`}
          icon={i === 0 && !searchText ? "🤖" : "📱"}
          title={issue.title}
          subtitle={issue.date ? formatDate(issue.date) : undefined}
          accessories={[{ text: `#${issue.number}` }]}
          actions={
            <ActionPanel>
              <Action
                title="Read Issue"
                icon={Icon.Document}
                onAction={() => push(<IssueDetail issue={issue} />)}
              />
              <Action
                title="Browse as List"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                onAction={() => push(<ArticleList issue={issue} />)}
              />
              <Action.OpenInBrowser url={issue.url} />
              <Action.CopyToClipboard
                title="Copy Issue URL"
                icon={Icon.Clipboard}
                content={issue.url}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// runnable check — fails if site markup drifts
export async function demo() {
  const archiveHtml = await fetch(ARCHIVE_URL).then((r) => r.text());
  const issues = parseArchive(archiveHtml);
  if (!issues.length) throw new Error("archive parse drift — no issues found");
  console.assert(
    issues.length > 500,
    `expected hundreds of issues, got ${issues.length}`,
  );
  const html = await fetch(issues[0].url).then((r) => r.text());
  const articles = parseArticles(html);
  console.assert(
    articles.length > 5,
    `expected articles, got ${articles.length}`,
  );
  console.log(`ok: ${issues[0].title} -> ${articles.length} articles`);
}
