import { Action, ActionPanel, List, showToast, Toast, Icon, open } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Cache } from "../utils/cache"; // Adjusted path
import { getRandomUserAgent } from "../utils/userAgents"; // Adjusted path
import { parseScholarHtmlResults } from "../utils/parser"; // Adjusted path
import type { SearchParams, SearchResult } from "../search-articles"; // Adjusted path for types
import { constructSearchUrl } from "../search-articles"; // Adjusted path for function
import { toggleBookmark, getBookmarks } from "../utils/bookmarks"; // Added bookmark imports
import { generateBibtex } from "../utils/bibtex"; // Import from new location
import { DEFAULT_REQUEST_TIMEOUT } from "../constants";

// Helper function to generate BibTeX citation (moved here)
// function generateBibtex(result: SearchResult): string { ... } // Removed

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
  const [bookmarkedLinks, setBookmarkedLinks] = useState<Set<string>>(new Set());
  const [isBlockedByCaptcha, setIsBlockedByCaptcha] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load initial bookmarks
    const loadBookmarks = async () => {
      const bookmarks = await getBookmarks();
      setBookmarkedLinks(new Set(bookmarks.map((b) => b.link)));
    };
    loadBookmarks();
  }, []);

  const fetchResults = useCallback(
    async (start = 0, appending = false) => {
      const effectiveSearchParams = { ...searchParams, sortBy: currentSortBy };
      if (!appending) {
        setIsLoading(true);
        setResults([]);
        setCurrentStart(0);
        setCanLoadMore(true);
        setRetryCount(0);
        setIsBlockedByCaptcha(false);
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
          timeout: DEFAULT_REQUEST_TIMEOUT,
        });
        const html = response.data;
        if (html.includes("sorry") || html.includes("CAPTCHA")) {
          setCanLoadMore(false);
          setIsBlockedByCaptcha(true);
          setResults([]);
          throw new Error("Access temporarily blocked by Google Scholar. Try again later or use a VPN.");
        }
        setIsBlockedByCaptcha(false);
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

            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
            }
            retryTimeoutRef.current = setTimeout(
              () => fetchResults(start, appending),
              Math.pow(2, retryCount + 1) * 1000,
            );
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
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    // Reset bookmarked state on new search/sort, could also merge if preferred
    const loadInitialBookmarks = async () => {
      const bookmarks = await getBookmarks();
      setBookmarkedLinks(new Set(bookmarks.map((b) => b.link)));
    };
    loadInitialBookmarks();
    fetchResults(0, false);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
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
      {isBlockedByCaptcha && !isLoading ? (
        <List.EmptyView
          title="Temporarily Blocked by Google Scholar"
          description={`Google Scholar is currently limiting requests from this IP address (CAPTCHA or other block). \n\n${retryCount > 0 && retryCount < 3 ? `Retrying... (Attempt ${retryCount + 1} of 3). Wait a moment.` : "All retries failed or retries exhausted."}\n\n**What you can do:**\n1. Try again in a few minutes.\n2. Use a VPN to change your IP address.\n3. Open Google Scholar directly in your browser to solve any CAPTCHA prompts.`}
          icon={Icon.Exclamationmark}
        />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView title="No results found" />
      ) : (
        <>
          {results.map((result, index) => {
            const isLinkBookmarked = result.link ? bookmarkedLinks.has(result.link) : false;
            return (
              <List.Item
                key={result.link || index}
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
                    {result.authorProfiles && result.authorProfiles.length > 0 && (
                      <ActionPanel.Section title="Author Profiles">
                        {result.authorProfiles.map((profile) => (
                          <Action.OpenInBrowser
                            key={profile.link}
                            // eslint-disable-next-line @raycast/prefer-title-case
                            title={`Open ${profile.type === "orcid" ? "ORCID" : profile.type === "scholar" ? "Scholar" : "Profile"} For ${profile.name}`}
                            url={profile.link}
                            icon={profile.type === "orcid" ? Icon.Info : Icon.Person}
                          />
                        ))}
                      </ActionPanel.Section>
                    )}
                    {result.link && (
                      <Action
                        title={isLinkBookmarked ? "Remove Bookmark" : "Save Bookmark"}
                        icon={isLinkBookmarked ? Icon.StarDisabled : Icon.Star}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={async () => {
                          if (!result.link) return;
                          const isNowBookmarked = await toggleBookmark(result);
                          setBookmarkedLinks((prev) => {
                            const newSet = new Set(prev);
                            if (isNowBookmarked) {
                              // True if it was NOT bookmarked and now IS
                              newSet.add(result.link!);
                            } else {
                              // False if it WAS bookmarked and now is NOT
                              newSet.delete(result.link!);
                            }
                            return newSet;
                          });

                          const toastOptions: Toast.Options = {
                            style: Toast.Style.Success,
                            title: isNowBookmarked ? "Bookmarked!" : "Bookmark Removed",
                          };

                          if (isNowBookmarked) {
                            toastOptions.primaryAction = {
                              title: "View Bookmarks (⌘+⇧+B)",
                              onAction: () => {
                                open(`raycast://extensions/leandro.maia/google-scholar/show-bookmarks`);
                              },
                              shortcut: { modifiers: ["cmd", "shift"], key: "b" },
                            };
                            toastOptions.message = "Article saved to your bookmarks.";
                          }

                          await showToast(toastOptions);
                        }}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Bibtex Citation"
                      content={generateBibtex(result)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
          {canLoadMore && !isLoading && (
            <List.Item
              title={isLoadingMore ? "Loading more results..." : "Load More Results"}
              icon={Icon.ArrowClockwise}
              actions={
                <ActionPanel>
                  <Action title="Load More Results" onAction={loadMoreResults} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
