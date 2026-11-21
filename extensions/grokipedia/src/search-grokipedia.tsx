import { ActionPanel, Action, List, Detail, Icon, Keyboard, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { GrokipediaClient } from "./grokipedia/client";
import { formatArticleMarkdown, getArticleUrl } from "./grokipedia/articles";
import { SearchResult } from "./grokipedia/types";

const client = new GrokipediaClient();

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();
  const abortable = useRef<AbortController | null>(null);
  const {
    data: searchResults,
    isLoading,
    error,
    revalidate,
  } = usePromise((query: string) => client.search(query, 12, 0, abortable.current?.signal), [query], {
    execute: query.length > 0,
    abortable,
    failureToastOptions: { title: "Could Not Search Grokipedia" },
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Grokipedia..."
      filtering={false}
      throttle
    >
      <List.EmptyView
        icon={error && query ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        title={
          !query
            ? "Search Grokipedia"
            : isLoading
              ? "Searching Grokipedia"
              : error
                ? "Could Not Search Grokipedia"
                : "No Articles Found"
        }
        description={
          !query
            ? "Enter a topic to find articles."
            : isLoading
              ? ""
              : error
                ? error.message
                : "Try a different search term."
        }
        actions={
          query ? (
            <ActionPanel>
              {error && (
                <Action
                  title="Retry Search"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              )}
              <Action.OpenInBrowser
                title="Search on Grokipedia"
                url={`https://grokipedia.com/search?q=${encodeURIComponent(query)}`}
              />
            </ActionPanel>
          ) : undefined
        }
      />
      {query && searchResults && (
        <List.Section title="Results" subtitle={String(searchResults.results.length)}>
          {searchResults.results.map((searchResult) => (
            <SearchListItem key={searchResult.slug} searchResult={searchResult} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const url = getArticleUrl(searchResult.slug);
  return (
    <List.Item
      title={searchResult.title}
      accessories={
        searchResult.viewCount === undefined
          ? []
          : [{ text: searchResult.viewCount.toLocaleString(), icon: Icon.Eye, tooltip: "View Count" }]
      }
      actions={
        <ActionPanel>
          <Action.Push title="View Article" target={<ArticleDetail slug={searchResult.slug} />} icon={Icon.Eye} />
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard title="Copy Page Link" content={url} />
        </ActionPanel>
      }
    />
  );
}

function ArticleDetail({ slug }: { slug: string }) {
  const abortable = useRef<AbortController | null>(null);
  const {
    data: pageData,
    isLoading,
    error,
    revalidate,
  } = usePromise((slug: string) => client.getPage(slug, abortable.current?.signal), [slug], {
    abortable,
    failureToastOptions: { title: "Could Not Load Article" },
  });
  const page = pageData?.page;
  const url = getArticleUrl(page?.slug ?? slug);
  const markdown = page
    ? formatArticleMarkdown(page)
    : error
      ? `# Could Not Load Article\n\n${error.message}`
      : isLoading
        ? ""
        : "# Article Not Found\n\nThis article is no longer available on Grokipedia.";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={page?.title ?? "Grokipedia"}
      actions={
        <ActionPanel>
          {error && (
            <Action
              title="Retry Loading Article"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          )}
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard title="Copy Page Link" content={url} />
          {page && (
            <>
              <Action.CopyToClipboard title="Copy Title" content={page.title} />
              <Action.CopyToClipboard title="Copy Content" content={markdown} />
              {page.citations.length > 0 && (
                <Action.CopyToClipboard
                  title="Copy All Citations"
                  content={page.citations.map((citation) => citation.url).join("\n")}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              )}
            </>
          )}
        </ActionPanel>
      }
      metadata={
        page ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Slug" text={page.slug} />
            {page.stats.viewCount !== undefined && (
              <Detail.Metadata.Label title="Views" text={page.stats.viewCount.toLocaleString()} />
            )}
            {page.citations.length > 0 && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.TagList title="Citations">
                  {page.citations.map((citation, index) => (
                    <Detail.Metadata.TagList.Item
                      key={`${citation.id}-${index}`}
                      text={`${index + 1}. ${citation.title}`}
                      color="#a8a29e"
                      onAction={() => open(citation.url)}
                    />
                  ))}
                </Detail.Metadata.TagList>
              </>
            )}
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}
