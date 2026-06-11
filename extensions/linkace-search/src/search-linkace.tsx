import { Action, ActionPanel, getPreferenceValues, Icon, List, type LaunchProps } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  buildLinkAceItemUrl,
  buildLinkSearchUrl,
  canSearchWithoutText,
  fetchLinkSearchResults,
  getReadableErrorMessage,
  isAbortError,
  normalizeBaseUrl,
  resolveProxyConfiguration,
} from "./linkace-api";
import {
  LinkDetail,
  getItemTitle,
  getListItemAccessories,
  getListItemIcon,
  getListItemSubtitle,
} from "./components/link-detail";
import { SearchFiltersForm } from "./components/search-filters-form";
import { DEFAULT_SEARCH_FILTERS, type LinkAceLink, type SearchFilters } from "./types";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchLinkace }>) {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState(props.arguments.searchTerm?.trim() ?? "");
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [links, setLinks] = useState<LinkAceLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [resolvedProxyUrl, setResolvedProxyUrl] = useState<string | undefined>();

  const normalizedBaseUrl = useMemo(() => normalizeBaseUrl(preferences.linkaceUrl), [preferences.linkaceUrl]);
  const trimmedSearchText = searchText.trim();
  const shouldSearch = trimmedSearchText.length > 0 || canSearchWithoutText(filters);
  const requestUrl = useMemo(
    () => buildLinkSearchUrl(normalizedBaseUrl, trimmedSearchText, filters),
    [filters, normalizedBaseUrl, trimmedSearchText],
  );
  const activeFilterSummary = useMemo(() => buildActiveFilterSummary(filters), [filters]);

  useEffect(() => {
    if (!shouldSearch) {
      setLinks([]);
      setError(null);
      setIsLoading(false);
      setResolvedProxyUrl(undefined);
      return;
    }

    const abortController = new AbortController();

    async function searchLinks() {
      setIsLoading(true);
      setError(null);

      let currentResolvedProxyUrl: string | undefined;

      try {
        const proxyConfiguration = await resolveProxyConfiguration(requestUrl, preferences.proxyUrl);
        currentResolvedProxyUrl = proxyConfiguration.proxyUrl;

        if (!abortController.signal.aborted) {
          setResolvedProxyUrl(currentResolvedProxyUrl);
        }

        const payload = await fetchLinkSearchResults({
          baseUrl: normalizedBaseUrl,
          apiKey: preferences.apiKey,
          proxyUrl: currentResolvedProxyUrl,
          query: trimmedSearchText,
          filters,
          signal: abortController.signal,
        });

        if (!Array.isArray(payload.data)) {
          throw new Error("The LinkAce API response does not contain a result list.");
        }

        const rawLinks = payload.data.filter((link) => typeof link.url === "string" && link.url.length > 0);
        setLinks(rawLinks);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        setLinks([]);
        setError(getReadableErrorMessage(error, currentResolvedProxyUrl));
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    searchLinks();

    return () => {
      abortController.abort();
    };
  }, [
    filters,
    normalizedBaseUrl,
    preferences.apiKey,
    preferences.proxyUrl,
    refreshToken,
    requestUrl,
    shouldSearch,
    trimmedSearchText,
  ]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      navigationTitle={activeFilterSummary ? `LinkAce Search · ${activeFilterSummary}` : "LinkAce Search"}
      searchBarPlaceholder="Search LinkAce links or use filters…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {!shouldSearch ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Enter a Search Term"
          description="You can also use filters like lists, tags, or broken links without a search term."
        />
      ) : links.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          title={error ? "Search Failed" : "No Matches Found"}
          description={error ?? "No LinkAce entries matched your search and active filters."}
        />
      ) : (
        <List.Section title="Results" subtitle={`${links.length}`}>
          {links.map((link) => {
            const title = getItemTitle(link);
            const linkAceItemUrl = buildLinkAceItemUrl(normalizedBaseUrl, link.id);

            return (
              <List.Item
                key={String(link.id)}
                icon={getListItemIcon(link)}
                title={title}
                subtitle={getListItemSubtitle(link)}
                accessories={getListItemAccessories(link)}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser title="Open Link" url={link.url} />
                      <Action.Push
                        title="Show Details"
                        shortcut={{ modifiers: ["cmd"], key: "y" }}
                        target={
                          <LinkDetail
                            link={link}
                            baseUrl={normalizedBaseUrl}
                            apiKey={preferences.apiKey}
                            proxyUrl={resolvedProxyUrl}
                          />
                        }
                      />
                      <Action.OpenInBrowser title="Open in LinkAce" url={linkAceItemUrl} icon={Icon.AppWindow} />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy URL"
                        content={link.url}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Title"
                        content={title}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Markdown Link"
                        content={`[${title}](${link.url})`}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Search">
                      <Action.Push
                        title="Configure Filters"
                        icon={Icon.Filter}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                        target={
                          <SearchFiltersForm
                            baseUrl={normalizedBaseUrl}
                            apiKey={preferences.apiKey}
                            proxyUrl={resolvedProxyUrl}
                            filters={filters}
                            onApply={setFilters}
                          />
                        }
                      />
                      <Action
                        title="Refresh Results"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={() => setRefreshToken((currentValue) => currentValue + 1)}
                      />
                      <Action
                        title="Reset Filters"
                        icon={Icon.ArrowCounterClockwise}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        onAction={() => setFilters(DEFAULT_SEARCH_FILTERS)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function buildActiveFilterSummary(filters: SearchFilters) {
  const parts: string[] = [];

  if (!filters.searchTitle || !filters.searchDescription) {
    const scopes = ["URL"];

    if (filters.searchTitle) {
      scopes.push("Title");
    }

    if (filters.searchDescription) {
      scopes.push("Description");
    }

    parts.push(scopes.join("+"));
  }

  if (filters.visibility === "private") {
    parts.push("Visibility: Private Only");
  }

  if (filters.brokenOnly) {
    parts.push("Broken Only");
  }

  if (filters.emptyLists) {
    parts.push("No Lists");
  } else if (filters.selectedListIds.length > 0) {
    parts.push(`${filters.selectedListIds.length} List Filter${filters.selectedListIds.length === 1 ? "" : "s"}`);
  }

  if (filters.emptyTags) {
    parts.push("No Tags");
  } else if (filters.selectedTagIds.length > 0) {
    parts.push(`${filters.selectedTagIds.length} Tag Filter${filters.selectedTagIds.length === 1 ? "" : "s"}`);
  }

  if (filters.sortOrder !== DEFAULT_SEARCH_FILTERS.sortOrder) {
    parts.push(`Sort: ${filters.sortOrder}`);
  }

  return parts.join(" · ");
}
