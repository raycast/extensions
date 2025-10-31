import { ActionPanel, List, Action, Detail, Icon } from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import { useStats, useTypeahead, useFullTextSearch, usePage } from "./utils";
import type { RawSearchItem } from "./types";
import CitationsList from "./citations";
import {
  pageUrl,
  TYPEAHEAD_LIMIT,
  FULL_TEXT_SEARCH_LIMIT,
  FULL_TEXT_SEARCH_OFFSET,
  MIN_SEARCH_LENGTH,
  SEARCH_DEBOUNCE_MS,
} from "./constants";
import { processMarkdownContent } from "./utils/markdown";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [searchText]);

  useEffect(() => {
    if (searchText.trim().length < MIN_SEARCH_LENGTH && isSearchActive) {
      setIsSearchActive(false);
    }
  }, [searchText, isSearchActive]);

  const { data: stats, isLoading: statsLoading } = useStats();

  const { data: typeaheadData, isLoading: typeaheadLoading } = useTypeahead(
    debouncedSearchText.length >= MIN_SEARCH_LENGTH ? debouncedSearchText : "",
    TYPEAHEAD_LIMIT,
  );

  const trimmedFullTextQuery = searchText.trim();

  const canExecuteFullText = trimmedFullTextQuery.length >= MIN_SEARCH_LENGTH;

  const { data: fullTextData, mutate: refetchFullText } = useFullTextSearch(
    trimmedFullTextQuery,
    FULL_TEXT_SEARCH_LIMIT,
    FULL_TEXT_SEARCH_OFFSET,
    { execute: isSearchActive && canExecuteFullText },
  );

  const handleFullTextSearch = useCallback(async () => {
    const nextQuery = searchText.trim();
    if (nextQuery.length < MIN_SEARCH_LENGTH) {
      return;
    }
    setIsSearchActive(true);
    await refetchFullText();
  }, [searchText, refetchFullText]);

  const items: RawSearchItem[] = isSearchActive ? fullTextData?.results || [] : typeaheadData?.results || [];
  const isLoading = typeaheadLoading || (isSearchActive && !fullTextData);

  const placeholder = stats
    ? `Search in ${stats.totalPages.toLocaleString()} article${stats.totalPages === 1 ? "" : "s"}`
    : "Search Grokipedia...";

  return (
    <List
      isLoading={isLoading || statsLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={placeholder}
      throttle // Combine Raycast throttling with SEARCH_DEBOUNCE_MS debounce upstream
    >
      {!isSearchActive &&
        searchText &&
        (canExecuteFullText ? (
          <List.Item
            icon={Icon.MagnifyingGlass}
            title={`Press Enter to search for "${searchText}"`}
            actions={
              <ActionPanel>
                <Action title="Full Text Search" icon={Icon.MagnifyingGlass} onAction={handleFullTextSearch} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item icon={Icon.Info} title={`Type at least ${MIN_SEARCH_LENGTH} characters to run full-text search`} />
        ))}
      {items.map((item) => (
        <List.Item
          key={item.slug}
          icon={Icon.Document}
          title={item.title}
          accessories={[{ icon: Icon.Eye }, { text: `${Number(item.viewCount).toLocaleString()}` }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Article" target={<ArticleDetail slug={item.slug} />} icon={Icon.Eye} />
              <Action.OpenInBrowser url={pageUrl(item.slug)} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              <Action
                title="Full Text Search"
                icon={Icon.MagnifyingGlass}
                onAction={handleFullTextSearch}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ArticleDetail({ slug }: { slug: string }) {
  const { data: page, isLoading } = usePage(slug, true, true);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading article..." />;
  }

  if (!page || !page.found) {
    return <Detail markdown="# Article Not Found\n\nThe requested article could not be loaded." />;
  }

  const { title, content, description, stats: pageStats, citations } = page.page;
  const articleBody = processMarkdownContent(content || description || "No content available.");

  return (
    <Detail
      markdown={articleBody}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Views" text={Number(pageStats.totalViews).toLocaleString()} />
          <Detail.Metadata.Label title="Daily Avg Views" text={pageStats.dailyAvgViews.toFixed(1)} />
          <Detail.Metadata.Label title="Quality Score" text={pageStats.qualityScore.toFixed(2)} />
          <Detail.Metadata.Label title="Citations" text={citations.length.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Open on Grokipedia" target={pageUrl(slug)} text="View" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={pageUrl(slug)} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <Action.CopyToClipboard
            content={pageUrl(slug)}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {citations.length > 0 && (
            <Action.Push
              title="View Citations"
              icon={Icon.Link}
              target={<CitationsList citations={citations} title={title} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
