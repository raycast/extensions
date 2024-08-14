import { Action, ActionPanel, Icon, LaunchProps, List, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { useEffect, useState } from "react";
import { string_to_unicode_variant as stringToUnicodeVariant } from "string-to-unicode-variant";

import { BunDocsSearchResult, searchBunDocs } from "./api/algolia";
import DocViewer, { DocViewerProps } from "./components/DocViewer";
import { bunDocsRawUrl } from "./constants";
import { applyFunctionToTags, bunDocsMarkdownToRealMarkdown } from "./utils/text";

function highlightResult(result: string) {
  return applyFunctionToTags(result, "{{{", "}}}", (s) => stringToUnicodeVariant(s, "bis", "ud"));
}

type SearchResultsBySection = Record<string, BunDocsSearchResult[]>;
type ResultType = "Documentation" | "Guides";
type ResultTypeFilter = "" | ResultType;

function resultUrlToSourceUrl(url: string | URL) {
  if (typeof url == "string") {
    url = new URL(url);
  }

  if (url.pathname.startsWith("/guides/")) {
    return `${bunDocsRawUrl}/guides/${url.pathname.substring(8)}.md`;
  } else if (url.pathname.startsWith("/docs/")) {
    return `${bunDocsRawUrl}/${url.pathname.substring(6)}.md`;
  }

  return null;
}

interface DocumentationViewerProps extends DocViewerProps {}
function DocumentationViewer(props: DocumentationViewerProps) {
  return (
    <DocViewer
      fetchOptions={{
        async parseResponse(response) {
          return bunDocsMarkdownToRealMarkdown(await response.text());
        },
      }}
      {...props}
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Docs }>) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(props.arguments.search);
  const [searchResults, setSearchResults] = useState<SearchResultsBySection>({});

  const [resultTypeFilter, setResultTypeFilter] = useState<ResultTypeFilter>("");
  const [showDetails, setShowDetails] = useState(true);

  const [isLoadingRecentSearches, setIsLoadingRecentSearches] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[] | null>(null);

  useEffect(() => {
    if (recentSearches === null) {
      LocalStorage.getItem("docs-recent-searches")
        .then((savedRecentSearches) => {
          if (typeof savedRecentSearches == "string") {
            setRecentSearches(JSON.parse(savedRecentSearches));
          }
        })
        .catch((error) => {
          showFailureToast(error, { title: "Failed to load recent searches" });
        })
        .finally(() => {
          setIsLoadingRecentSearches(false);
        });
    }
  }, [recentSearches]);

  // TODO: debounce
  function search(newSearchQuery: string) {
    setSearchQuery(newSearchQuery);

    if (!newSearchQuery) {
      setIsLoading(false);
      setSearchResults({});
      return;
    }

    console.debug("Searching Algolia:", newSearchQuery);

    setIsLoading(true);
    searchBunDocs(newSearchQuery, {
      attributesToRetrieve: ["content", "url"],
      attributesToSnippet: ["content:15"],
      highlightPreTag: "{{{",
      highlightPostTag: "}}}",
      cacheable: true,
      hitsPerPage: 100,
    })
      .then((response) => {
        const newSearchResults: SearchResultsBySection = {};

        for (const result of response.hits) {
          const section = result._highlightResult?.hierarchy?.lvl0?.value || "Other";

          if (!newSearchResults[section]) {
            newSearchResults[section] = [];
          }

          newSearchResults[section].push(result);
        }

        setSearchResults(newSearchResults);
      })
      .catch((error) => {
        showFailureToast(error, { title: "Failed to search Bun docs" });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  async function updateRecentSearches(newRecentSearches: string[]) {
    setRecentSearches(newRecentSearches);
    await LocalStorage.setItem("docs-recent-searches", JSON.stringify(newRecentSearches));
  }

  function addRecentSearch() {
    if (!searchQuery) {
      return;
    }

    updateRecentSearches(Array.from(new Set([...(recentSearches || []), searchQuery])));
  }

  return (
    <List
      isLoading={isLoading || isLoadingRecentSearches}
      searchText={searchQuery}
      onSearchTextChange={search}
      searchBarAccessory={
        <List.Dropdown tooltip="Result type" storeValue onChange={(v) => setResultTypeFilter(v as ResultTypeFilter)}>
          <List.Dropdown.Item title="All" value="" />
          <List.Dropdown.Item title="Documentation" value="Documentation" />
          <List.Dropdown.Item title="Guides" value="Guides" />
        </List.Dropdown>
      }
      isShowingDetail={showDetails && !!searchQuery.length}
    >
      {searchQuery.length ? (
        Object.entries(searchResults).map(([section, results]) => {
          if (resultTypeFilter && resultTypeFilter != section) {
            return;
          }

          return (
            <List.Section key={section} title={section}>
              {results.map((result) => {
                let title: string | null = null;
                if (result._snippetResult?.content?.value) {
                  title = highlightResult(result._snippetResult.content.value);
                } else if (result._highlightResult?.hierarchy?.lvl1?.value) {
                  title = highlightResult(result._highlightResult?.hierarchy?.lvl1?.value);
                }

                if (!title) {
                  return;
                }

                const docUrl = result.url ? resultUrlToSourceUrl(result.url) : null;

                return (
                  <List.Item
                    key={result.objectID}
                    title={title}
                    detail={
                      docUrl ? (
                        <DocumentationViewer url={docUrl} listDetail />
                      ) : (
                        <List.Item.Detail markdown="*No preview available*" />
                      )
                    }
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section>
                          {docUrl && (
                            <Action.Push
                              icon={Icon.Eye}
                              title="View Doc"
                              target={<DocumentationViewer url={docUrl} />}
                              onPush={addRecentSearch}
                            />
                          )}
                          {result.url && <Action.OpenInBrowser url={result.url} onOpen={addRecentSearch} />}
                        </ActionPanel.Section>
                        <ActionPanel.Section>
                          <Action
                            icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
                            title={`${showDetails ? "Hide" : "Show"} Preview`}
                            onAction={() => {
                              setShowDetails(!showDetails);
                            }}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })
      ) : recentSearches?.length ? (
        <List.Section title="Recent searches">
          {recentSearches.map((query, i) => (
            <List.Item
              key={query}
              title={query}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.MagnifyingGlass}
                    title={`Search "${query}"`}
                    onAction={() => {
                      search(query);
                    }}
                  />
                  <Action
                    icon={Icon.XMarkCircle}
                    title="Remove From Recent Searches"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => {
                      updateRecentSearches(recentSearches.toSpliced(i, 1));
                    }}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Clear All Recent Searches"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={() => {
                      updateRecentSearches([]);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No recent searches" />
      )}
    </List>
  );
}
