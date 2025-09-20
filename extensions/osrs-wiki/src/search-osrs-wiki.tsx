import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { useFetch } from "@raycast/utils";
import debounce from "lodash.debounce";

interface Article {
  pageid: number;
  title: string;
  snippet: string;
  url: string;
  icon: string | { source: string };
}

interface SearchResponse {
  query?: {
    search?: SearchResult[];
  };
}

interface SearchResult {
  ns: number;
  title: string;
  pageid: number;
  snippet: string;
  // Other properties omitted for brevity
}

interface PageResponse {
  query?: {
    pages?: {
      [pageid: string]: Page;
    };
  };
}

interface Page {
  pageid: number;
  ns: number;
  title: string;
  extract?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  categories?: {
    ns: number;
    title: string;
  }[];
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    handler();

    return () => {
      handler.cancel();
    };
  }, [searchText]);

  // First API call: Get search results sorted by relevance
  const searchUrl = `https://oldschool.runescape.wiki/api.php?action=query&format=json&list=search&srlimit=20&srsearch=${encodeURIComponent(
    debouncedSearchText,
  )}&srsort=relevance&srprop=snippet`;

  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
  } = useFetch<SearchResponse>(searchUrl, {
    keepPreviousData: true,
    execute: debouncedSearchText.trim().length > 0,
  });

  useEffect(() => {
    if (searchError) {
      showToast(Toast.Style.Failure, "Failed to fetch search results", String(searchError));
    }
  }, [searchError]);

  // Extract page IDs from search results
  const pageIds = searchData?.query?.search?.map((result) => result.pageid).join("|");

  // Second API call: Get detailed page data
  const pageDataUrl = `https://oldschool.runescape.wiki/api.php?action=query&format=json&prop=pageimages|categories|extracts&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=64&cllimit=500&pageids=${pageIds ?? ""}`;

  const {
    data: pageData,
    isLoading: isPageDataLoading,
    error: pageDataError,
  } = useFetch<PageResponse>(pageDataUrl, {
    keepPreviousData: true,
    execute: pageIds != null && pageIds.length > 0,
  });

  useEffect(() => {
    if (pageDataError) {
      showToast(Toast.Style.Failure, "Failed to fetch page data", String(pageDataError));
    }
  }, [pageDataError]);

  const isLoading = isSearchLoading || isPageDataLoading;

  const articles = pageData && searchData ? parseArticles(searchData, pageData) : [];

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search OSRS Wiki..." throttle>
      {articles.map((article) => (
        <List.Item
          key={article.pageid}
          title={article.title}
          subtitle={article.snippet}
          icon={article.icon}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={article.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function parseArticles(searchData: SearchResponse, pageData: PageResponse): Article[] {
  const searchResults = searchData.query?.search || [];
  const pages = pageData.query?.pages || {};

  // Create a map of page IDs to pages
  const pageMap: { [pageid: number]: Page } = {};
  Object.values(pages).forEach((page) => {
    pageMap[page.pageid] = page;
  });

  const articles: Article[] = searchResults.map((result: SearchResult) => {
    const page = pageMap[result.pageid];
    const title = page?.title || result.title;
    const pageid = result.pageid;
    const url = `https://oldschool.runescape.wiki/w/${encodeURIComponent(title)}`;
    const extract = page?.extract || "";
    const snippet = extract.split("\n")[0] || result.snippet.replace(/<\/?[^>]+(>|$)/g, "");
    const categories = page?.categories ? page.categories.map((cat) => cat.title) : [];

    let icon: string | { source: string };

    if (categories.some((cat) => cat.includes("Items"))) {
      if (page?.thumbnail?.source) {
        icon = page.thumbnail.source; // Remote URL
      } else {
        icon = { source: "item_icon.png" }; // Local asset
      }
    } else if (categories.some((cat) => cat.includes("Quests"))) {
      icon = { source: "quest_icon.webp" }; // Local asset
    } else {
      icon = { source: "item_icon.png" }; // Local asset
    }

    return {
      title,
      pageid,
      snippet,
      url,
      icon,
    };
  });

  return articles;
}
