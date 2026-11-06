import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { useArticleSearch } from "./hooks/use-article-search";
import { articleMarkdown, WikiHowArticle } from "./lib/wikihow";

const RECENT_KEY = "recent-articles";
const MAX_RECENT = 25;

function siteSearchUrl(query: string): string {
  return `https://www.wikihow.com/wikiHowTo?search=${encodeURIComponent(query.trim())}`;
}

async function readRecent(): Promise<WikiHowArticle[]> {
  try {
    const raw = await LocalStorage.getItem<string>(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as WikiHowArticle[]).filter((a) => a && a.url && a.title) : [];
  } catch {
    return [];
  }
}

async function rememberArticle(article: WikiHowArticle): Promise<void> {
  const recent = (await readRecent()).filter((item) => item.url !== article.url);
  await LocalStorage.setItem(RECENT_KEY, JSON.stringify([article, ...recent].slice(0, MAX_RECENT)));
}

function useRecent() {
  const [recent, setRecent] = useState<WikiHowArticle[]>([]);
  const reload = () => void readRecent().then(setRecent);
  useEffect(reload, []);
  return {
    recent,
    remember: (article: WikiHowArticle) => void rememberArticle(article).then(reload),
    forget: async (article: WikiHowArticle) => {
      const next = (await readRecent()).filter((item) => item.url !== article.url);
      await LocalStorage.setItem(RECENT_KEY, JSON.stringify(next));
      reload();
    },
    clear: async () => {
      await LocalStorage.removeItem(RECENT_KEY);
      reload();
    },
  };
}

function ArticleActions({ article }: { article: WikiHowArticle }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open on WikiHow" url={article.url} />
      <Action.CopyToClipboard
        title="Copy Article Link"
        content={article.url}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
    </ActionPanel>
  );
}

function ArticlePreview({ article }: { article: WikiHowArticle }) {
  return (
    <Detail
      navigationTitle="Article Excerpts"
      markdown={articleMarkdown(article)}
      actions={<ArticleActions article={article} />}
    />
  );
}

export function Setup() {
  return (
    <Detail
      markdown={[
        "# Search wikiHow articles",
        "Find articles and read indexed search excerpts without leaving Raycast. Open a result on wikiHow for the complete guide.",
        "## Set up search",
        "1. Create a personal **Web Search API key** in the [Brave API dashboard](https://api-dashboard.search.brave.com/).",
        "2. Add it to **Brave Search API Key** in this extension’s preferences.",
        "Your searches use your Brave API allowance. Your query and API key are sent to Brave. Results stay in memory while this command is open.",
        "This is an unofficial wikiHow extension. Previews contain search excerpts; they are not full articles.",
      ].join("\n\n")}
      actions={
        <ActionPanel>
          <Action title="Set API Key" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Brave API Dashboard" url="https://api-dashboard.search.brave.com/" />
        </ActionPanel>
      }
    />
  );
}

export default function SearchArticles(props: LaunchProps<{ arguments: Arguments.SearchArticles }>) {
  const { braveApiKey = "" } = getPreferenceValues<Preferences>();
  const hasKey = Boolean(braveApiKey.trim());
  const [query, setQuery] = useState(props.arguments.query || "");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const { data, error, isLoading } = useArticleSearch(query, page, braveApiKey, revision);
  const history = useRecent();
  const trimmed = query.trim();

  const pagingActions = (
    <ActionPanel.Section title="Search">
      {trimmed ? <Action.OpenInBrowser title="Search on WikiHow.com" url={siteSearchUrl(trimmed)} /> : null}
      {data?.hasMore ? (
        <Action
          title="Next Results Page"
          icon={Icon.ArrowRight}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "]" }, Windows: { modifiers: ["ctrl"], key: "]" } }}
          onAction={() => setPage((current) => current + 1)}
        />
      ) : null}
      {page > 0 ? (
        <Action
          title="Previous Results Page"
          icon={Icon.ArrowLeft}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "[" }, Windows: { modifiers: ["ctrl"], key: "[" } }}
          onAction={() => setPage((current) => current - 1)}
        />
      ) : null}
      {trimmed && hasKey ? (
        <Action
          title="Retry Search"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => setRevision((current) => current + 1)}
        />
      ) : null}
      <Action title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );

  function articleItem(article: WikiHowArticle, fromHistory = false) {
    return (
      <List.Item
        key={`${fromHistory ? "recent" : "result"}-${article.url}`}
        title={article.title}
        icon={fromHistory ? Icon.Clock : Icon.Document}
        detail={<List.Item.Detail markdown={articleMarkdown(article)} />}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open on WikiHow" url={article.url} onOpen={() => history.remember(article)} />
            <Action.Push
              title="Read Excerpts"
              icon={Icon.Paragraph}
              target={<ArticlePreview article={article} />}
              onPush={() => history.remember(article)}
            />
            <Action.CopyToClipboard
              title="Copy Article Link"
              content={article.url}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy as Markdown Link" content={`[${article.title}](${article.url})`} />
            {fromHistory ? (
              <ActionPanel.Section title="History">
                <Action
                  title="Remove from Recent"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => history.forget(article)}
                />
                <Action
                  title="Clear Recent Articles"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={history.clear}
                />
              </ActionPanel.Section>
            ) : null}
            {pagingActions}
          </ActionPanel>
        }
      />
    );
  }

  const keyHint = !hasKey ? (
    <List.Item
      title="Preview articles inside Raycast"
      subtitle="Add a free Brave Search API key"
      icon={Icon.Key}
      detail={
        <List.Item.Detail
          markdown={[
            "## Search without leaving Raycast",
            "Without a key, searches open on wikiHow.com. With a free **Brave Search API key**, results and excerpts appear right here.",
            "1. Create a key in the [Brave API dashboard](https://api-dashboard.search.brave.com/).",
            "2. Paste it into **Brave Search API Key** in this extension's preferences.",
            "Your query and key are sent to Brave. This is an unofficial wikiHow extension.",
          ].join("\n\n")}
        />
      }
      actions={
        <ActionPanel>
          <Action title="Add API Key" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Brave API Dashboard" url="https://api-dashboard.search.brave.com/" />
        </ActionPanel>
      }
    />
  ) : null;

  return (
    <List
      navigationTitle="Search wikiHow Articles"
      searchBarPlaceholder="How to…"
      searchText={query}
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={Boolean(data?.articles.length || (!trimmed && history.recent.length) || !hasKey)}
      onSearchTextChange={(text) => {
        setQuery(text);
        setPage(0);
      }}
      actions={<ActionPanel>{pagingActions}</ActionPanel>}
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        title={
          error
            ? "Search Could Not Complete"
            : trimmed
              ? isLoading
                ? "Searching wikiHow…"
                : "No Articles Found"
              : "Find a How-To Guide"
        }
        description={
          error?.message ||
          (trimmed ? "Try another topic or a shorter search." : "Enter a topic to see articles and search excerpts.")
        }
        actions={<ActionPanel>{pagingActions}</ActionPanel>}
      />
      {trimmed && !hasKey ? (
        <List.Section title="Search">
          <List.Item
            title={`Search “${trimmed}” on wikiHow`}
            icon={Icon.Globe}
            detail={<List.Item.Detail markdown={`Opens wikiHow's own search for **${trimmed}** in your browser.`} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Search on WikiHow.com" url={siteSearchUrl(trimmed)} />
                <Action title="Add API Key" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {data ? (
        <List.Section title={`Page ${page + 1}`} subtitle="Search excerpts · Full guides open on wikiHow">
          {data.articles.map((article) => articleItem(article))}
        </List.Section>
      ) : null}
      {!trimmed && history.recent.length ? (
        <List.Section title="Recently Viewed">
          {history.recent.map((article) => articleItem(article, true))}
        </List.Section>
      ) : null}
      {keyHint ? <List.Section title="Setup">{keyHint}</List.Section> : null}
    </List>
  );
}
