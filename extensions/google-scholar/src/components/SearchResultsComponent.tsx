import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Cache } from "../utils/cache"; // Adjusted path
import { getRandomUserAgent } from "../utils/userAgents"; // Adjusted path
import { parseScholarHtmlResults } from "../utils/parser"; // Adjusted path
import type { SearchParams, SearchResult } from "../search-articles"; // Adjusted path for types
import { constructSearchUrl } from "../search-articles"; // Adjusted path for function

// Helper function to generate BibTeX citation (moved here)
function generateBibtex(result: SearchResult): string {
  const { title, authors, publication, year } = result;
  let keyAuthorPart = "UnknownAuthor";
  if (authors) {
    const firstAuthor = authors.split(",")[0].trim();
    keyAuthorPart =
      firstAuthor
        .split(" ")
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, "") ||
      firstAuthor.replace(/[^a-zA-Z0-9]/g, "") ||
      "Author";
  }
  const keyYearPart = year?.replace(/[^a-zA-Z0-9]/g, "") || "Year";
  const keyTitlePart =
    title
      ?.split(" ")[0]
      ?.replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 10) || "Title";
  const bibtexKey = `${keyAuthorPart}${keyYearPart}${keyTitlePart}`.replace(/[^a-zA-Z0-9]/g, "");
  const formattedAuthors =
    authors
      ?.split(",")
      .map((author) => author.trim())
      .join(" and ") || "";
  let bibtexEntry = `@article{${bibtexKey},\n`;
  if (formattedAuthors) bibtexEntry += `  author    = {${formattedAuthors}},\n`;
  if (title) bibtexEntry += `  title     = {${title}},\n`;
  if (publication) bibtexEntry += `  journal   = {${publication}},\n`;
  if (year) bibtexEntry += `  year      = {${year}},\n`;
  bibtexEntry += `}`;
  return bibtexEntry;
}

interface SearchResultsComponentProps {
  searchParams: SearchParams;
}

export function SearchResultsComponent({ searchParams }: SearchResultsComponentProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [currentStart, setCurrentStart] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSortBy, setCurrentSortBy] = useState<"relevance" | "date">(searchParams.sortBy || "relevance");

  const fetchResults = useCallback(
    async (start = 0, appending = false) => {
      const effectiveSearchParams = { ...searchParams, sortBy: currentSortBy };
      if (!appending) {
        setIsLoading(true);
        setResults([]);
        setCurrentStart(0);
        setCanLoadMore(true);
        setRetryCount(0);
      } else {
        setIsLoadingMore(true);
      }
      const url = constructSearchUrl(effectiveSearchParams, start);
      const cachedPageResults = Cache.get(url) as SearchResult[] | undefined;
      if (cachedPageResults && Array.isArray(cachedPageResults)) {
        setResults((prevResults) => (appending ? [...prevResults, ...cachedPageResults] : cachedPageResults));
        setCurrentStart(start + cachedPageResults.length);
        setCanLoadMore(cachedPageResults.length === 10);
        if (!appending) setIsLoading(false);
        else setIsLoadingMore(false);
        if (process.env.NODE_ENV === "development") {
          await showToast({
            style: Toast.Style.Success,
            title: "Loaded page from cache",
            message: `Page starting at ${start}`,
          });
        }
        return;
      }
      try {
        const response = await axios.get(url, {
          headers: { "User-Agent": getRandomUserAgent() },
          timeout: 10000,
        });
        const html = response.data;
        if (html.includes("sorry") || html.includes("CAPTCHA")) {
          setCanLoadMore(false);
          throw new Error("Access temporarily blocked by Google Scholar. Try again later or use a VPN.");
        }
        const pageResults = parseScholarHtmlResults(html);
        if (pageResults.length === 0 && !appending) {
          await showToast({ style: Toast.Style.Success, title: "No results found" });
        }
        Cache.set(url, pageResults);
        setResults((prevResults) => (appending ? [...prevResults, ...pageResults] : pageResults));
        setCurrentStart(start + pageResults.length);
        setCanLoadMore(pageResults.length === 10);
      } catch (error) {
        console.error("Error fetching results:", error);
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        if (axios.isAxiosError(error) && (error.response?.status === 429 || errorMessage.includes("blocked"))) {
          if (retryCount < 3 && !appending) {
            setRetryCount((prev) => prev + 1);
            await showToast({
              style: Toast.Style.Animated,
              title: "Rate limited/blocked, retrying...",
              message: `Attempt ${retryCount + 1} of 3`,
            });
            const timeoutId = setTimeout(() => fetchResults(start, appending), Math.pow(2, retryCount + 1) * 1000);
            return () => clearTimeout(timeoutId);
            return;
          } else {
            errorMessage = "Google Scholar is temporarily blocking requests. Try again later or use a VPN.";
            setCanLoadMore(false);
          }
        }
        await showToast({ style: Toast.Style.Failure, title: "Search failed", message: errorMessage });
        if (!appending) setResults([]);
      } finally {
        if (!appending) setIsLoading(false);
        else setIsLoadingMore(false);
      }
    },
    [
      searchParams,
      currentSortBy,
      retryCount,
      setIsLoading,
      setResults,
      setCurrentStart,
      setCanLoadMore,
      setRetryCount,
      setIsLoadingMore,
    ],
  );

  useEffect(() => {
    fetchResults(0, false);
  }, [searchParams, currentSortBy, fetchResults]);

  const loadMoreResults = () => {
    if (!isLoadingMore && canLoadMore) {
      fetchResults(currentStart, true);
    }
  };

  return (
    <List
      isLoading={isLoading || isLoadingMore}
      isShowingDetail={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Options"
          storeValue={true}
          onChange={(newValue) => {
            if (newValue === "clear_cache") {
              Cache.clear();
              showToast({ style: Toast.Style.Success, title: "Cache cleared" });
            } else if (newValue === "relevance" || newValue === "date") {
              setCurrentSortBy(newValue as "relevance" | "date");
            }
          }}
          value={currentSortBy}
        >
          <List.Dropdown.Section title="Sort By">
            <List.Dropdown.Item title="Relevance" value="relevance" />
            <List.Dropdown.Item title="Date" value="date" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Cache">
            <List.Dropdown.Item title="Clear Cache" value="clear_cache" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {results.length === 0 && !isLoading ? (
        <List.EmptyView title="No results found" />
      ) : (
        <>
          {results.map((result, index) => (
            <List.Item
              key={index}
              title={result.title}
              subtitle={result.authors}
              accessories={result.pdfLink ? [{ text: "PDF" }] : []}
              detail={
                <List.Item.Detail
                  markdown={`### ${result.title}\n\n${result.snippet || "No abstract available"}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Title" text={result.title} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Authors" text={result.authors || "Unknown"} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Published In" text={result.publication || "Unknown"} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Year" text={result.year || "Unknown"} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Cited By" text={result.citationCount || "0"} />
                      {result.link && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Link
                            title="Article Link"
                            target={result.link}
                            text="Open Article"
                          />
                        </>
                      )}
                      {result.pdfLink && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Link title="PDF Link" target={result.pdfLink} text="Open PDF" />
                        </>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {result.link && <Action.OpenInBrowser title="Open Article" url={result.link} />}
                  {result.pdfLink && <Action.OpenInBrowser title="Open Pdf" url={result.pdfLink} />}
                  <Action.CopyToClipboard
                    title="Copy Bibtex Citation"
                    content={generateBibtex(result)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
          {canLoadMore && !isLoading && (
            <List.Item
              title={isLoadingMore ? "Loading more results..." : "Load More Results"}
              icon={Icon.ArrowClockwise} // Built-in Raycast icon
              actions={
                <ActionPanel>
                  <Action title="Load More" onAction={loadMoreResults} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
