import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { MutatePromise, useFetch } from "@raycast/utils";
import { useState } from "react";
import { SourceHighlights } from "./components/SourceHighlights";
import { Article, endpoint, headers, Paginated, parseResponse, patch, ScreviError } from "./lib/screvi";
import { formatDate, tagTint, truncate } from "./lib/format";

const PER_PAGE = 50;

const HOME_STATUSES = [
  { value: "inbox", title: "Inbox", icon: Icon.Tray },
  { value: "later", title: "Later", icon: Icon.Clock },
  { value: "archive", title: "Archive", icon: Icon.Box },
] as const;

export default function BrowseArticles() {
  const [searchText, setSearchText] = useState("");
  const [homeStatus, setHomeStatus] = useState("inbox");
  const [showingDetail, setShowingDetail] = useState(false);

  const { data, isLoading, pagination, mutate } = useFetch(
    (options: { page: number }) =>
      endpoint("/articles", {
        q: searchText.trim(),
        home_status: homeStatus,
        page: options.page + 1,
        per_page: PER_PAGE,
      }),
    {
      headers: headers(),
      parseResponse: (response) => parseResponse<Paginated<Article>>(response),
      mapResult: (result) => ({ data: result.data, hasMore: result.pagination.has_more }),
      initialData: [] as Article[],
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load your articles" },
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by title, author or site…"
      isShowingDetail={showingDetail && data.length > 0}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Where the article sits" storeValue onChange={setHomeStatus}>
          {HOME_STATUSES.map((item) => (
            <List.Dropdown.Item key={item.value} title={item.title} value={item.value} icon={item.icon} />
          ))}
          <List.Dropdown.Item title="Everything" value="" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Tray}
        title={searchText ? "Nothing matched" : "Nothing here"}
        description={
          searchText
            ? "Try the site name, or a word from the title."
            : "Save a link with the Save Link command and it lands in your inbox."
        }
      />
      {data.map((article) => (
        <ArticleListItem
          key={article.id}
          article={article}
          filteredStatus={homeStatus}
          showingDetail={showingDetail}
          onToggleDetail={() => setShowingDetail((value) => !value)}
          mutate={mutate}
        />
      ))}
    </List>
  );
}

interface ItemProps {
  article: Article;
  /** The home_status the list is filtered to, or "" when showing everything. */
  filteredStatus: string;
  showingDetail: boolean;
  onToggleDetail: () => void;
  mutate: MutatePromise<Article[]>;
}

function ArticleListItem({ article, filteredStatus, showingDetail, onToggleDetail, mutate }: ItemProps) {
  /**
   * Triage and favouriting share one optimistic path. Moving an article out of
   * the list you are filtering on removes the row rather than leaving a stale one.
   */
  async function update(changes: Partial<Pick<Article, "home_status" | "favorite">>, success: string) {
    try {
      await mutate(patch(`/articles/${article.id}`, changes), {
        optimisticUpdate: (items) => {
          const leavesTheList =
            changes.home_status !== undefined && filteredStatus !== "" && changes.home_status !== filteredStatus;
          return leavesTheList
            ? items.filter((item) => item.id !== article.id)
            : items.map((item) => (item.id === article.id ? { ...item, ...changes } : item));
        },
        rollbackOnError: true,
      });
      await showToast({ style: Toast.Style.Success, title: success });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update the article",
        message:
          error instanceof ScreviError && error.status === 403
            ? "This API key has no write scope. Mint one with write access in Settings > API."
            : error instanceof Error
              ? error.message
              : undefined,
      });
    }
  }

  const title = article.title?.trim() || article.url;
  const byline = article.author || article.site_name || article.source_domain || "";

  const accessories: List.Item.Accessory[] = [];
  if (!showingDetail) {
    if (article.favorite) {
      accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
    }
    if (article.highlight_count > 0) {
      accessories.push({ icon: Icon.Highlight, text: String(article.highlight_count), tooltip: "Highlights" });
    }
    if (article.progress_percentage > 0 && article.progress_percentage < 100) {
      accessories.push({ text: `${article.progress_percentage}%`, tooltip: "Read so far" });
    }
    if (article.reading_time_minutes) {
      accessories.push({ icon: Icon.Clock, text: `${article.reading_time_minutes} min`, tooltip: "Reading time" });
    }
  }

  return (
    <List.Item
      icon={article.image_url ? { source: article.image_url, fallback: Icon.Document } : Icon.Document}
      title={truncate(title, showingDetail ? 60 : 110)}
      subtitle={showingDetail ? undefined : byline}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={[`## ${title}`, article.excerpt?.trim() ?? "_No excerpt._"].join("\n\n")}
          metadata={
            <List.Item.Detail.Metadata>
              {byline ? <List.Item.Detail.Metadata.Label title="Author" text={byline} /> : null}
              {article.source_domain ? (
                <List.Item.Detail.Metadata.Link title="Site" text={article.source_domain} target={article.url} />
              ) : null}
              <List.Item.Detail.Metadata.Label title="Status" text={article.home_status} icon={Icon.Tray} />
              {article.reading_time_minutes ? (
                <List.Item.Detail.Metadata.Label title="Reading Time" text={`${article.reading_time_minutes} min`} />
              ) : null}
              <List.Item.Detail.Metadata.Label title="Saved" text={formatDate(article.saved_at) ?? "Unknown"} />
              {article.tags.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {article.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item key={tag.id} text={tag.name} color={tagTint(tag)} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Read in Screvi" url={article.screvi_url} icon={Icon.Book} />
            <Action.OpenInBrowser
              title="Open Original"
              url={article.url}
              icon={Icon.Globe}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            {article.highlight_count > 0 ? (
              <Action.Push
                title="Show Highlights"
                icon={Icon.Highlight}
                target={<SourceHighlights id={article.id} name={title} />}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Triage">
            {HOME_STATUSES.filter((status) => status.value !== article.home_status).map((status) => (
              <Action
                key={status.value}
                title={`Move to ${status.title}`}
                icon={status.icon}
                onAction={() => update({ home_status: status.value }, `Moved to ${status.title}`)}
              />
            ))}
            <Action
              title={article.favorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={article.favorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() =>
                update(
                  { favorite: !article.favorite },
                  article.favorite ? "Removed from favorites" : "Added to favorites",
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={showingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action.CopyToClipboard title="Copy Original URL" content={article.url} />
            <Action.CopyToClipboard
              title="Copy Screvi Link"
              content={article.screvi_url}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
