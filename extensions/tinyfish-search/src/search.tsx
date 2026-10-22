import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  LaunchType,
  List,
  getPreferenceValues,
  launchCommand,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useMemo, useState } from "react";
import { tinyfish } from "./auth";
import { FetchedPages } from "./components/fetched-pages";
import { SearchFiltersForm } from "./components/search-filters";
import { filterSummary, formatSearchResult, hostname } from "./content";
import { FetchPagesForm } from "./components/fetch-pages-form";
import { useSearch } from "./hooks/use-search";
import { DEFAULT_SEARCH_FILTERS, type SearchFilters } from "./tinyfish";
import { SaveReadingAction, SaveSearchForm } from "./components/library-actions";
import { searchRecipeSchema } from "./library-store";

function Command(props: LaunchProps<{ arguments: Arguments.Search; launchContext: Record<string, unknown> }>) {
  const [recipe] = useState(() => searchRecipeSchema.safeParse(props.launchContext));
  const preferences = useMemo(
    () => ({
      ...getPreferenceValues<Preferences.Search>(),
      ...(recipe.success ? { location: recipe.data.location, language: recipe.data.language } : {}),
    }),
    [recipe],
  );
  const [query, setQuery] = useState(recipe.success ? recipe.data.query : (props.arguments.query ?? ""));
  const [filters, setFilters] = useState<SearchFilters>(recipe.success ? recipe.data.filters : DEFAULT_SEARCH_FILTERS);
  const { results, isLoading, hasMore, error, loadMore, retry } = useSearch(query.trim(), filters, preferences);
  const summary = filterSummary(filters);

  function changeSearchType(type: string) {
    const domains = {
      includeDomains: filters.includeDomains,
      excludeDomains: filters.excludeDomains,
      purpose: filters.purpose,
    };
    if (type === "research_paper") setFilters({ type, ...domains });
    else if (type === "web" || type === "news")
      setFilters({ type, ...domains, time: filters.type === "research_paper" ? { kind: "any" } : filters.time });
  }

  const searchActions = (
    <>
      {hasMore && !isLoading ? (
        <Action
          title={error ? "Retry Loading More" : "Load More Results"}
          icon={Icon.ArrowDown}
          onAction={loadMore}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "l" }, Windows: { modifiers: ["ctrl"], key: "l" } }}
        />
      ) : null}
      <Action.Push
        title="Edit Search Filters"
        icon={Icon.Filter}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "f" },
          Windows: { modifiers: ["ctrl", "shift"], key: "f" },
        }}
        target={<SearchFiltersForm filters={filters} onApply={setFilters} />}
      />
      <Action
        title="Reset Filters"
        icon={Icon.ArrowCounterClockwise}
        onAction={() => setFilters(DEFAULT_SEARCH_FILTERS)}
      />
      <Action.Push title="Fetch Pages" icon={Icon.Document} target={<FetchPagesForm />} />
      {query.trim() ? (
        <Action.Push
          title="Save Search"
          icon={Icon.Bookmark}
          target={
            <SaveSearchForm
              recipe={{ query: query.trim(), filters, location: preferences.location, language: preferences.language }}
            />
          }
        />
      ) : null}
      <Action
        title="Saved Searches and History"
        icon={Icon.Clock}
        onAction={() => launchCommand({ name: "saved-searches", type: LaunchType.UserInitiated })}
      />
      <Action
        title="Reading List"
        icon={Icon.Bookmark}
        onAction={() => launchCommand({ name: "reading-list", type: LaunchType.UserInitiated })}
      />
      {results.length ? (
        <Action.CopyToClipboard
          title="Copy All Results as Markdown"
          content={results
            .map((result) => `[${result.title}](${result.url})${result.snippet ? `\n${result.snippet}` : ""}`)
            .join("\n\n")}
        />
      ) : null}
    </>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={results.length > 0}
      searchText={query}
      searchBarPlaceholder="Search with TinyFish…"
      onSearchTextChange={setQuery}
      throttle
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Search Type" value={filters.type} onChange={changeSearchType}>
          <List.Dropdown.Item title="Web" value="web" />
          <List.Dropdown.Item title="News" value="news" />
          <List.Dropdown.Item title="Research Papers" value="research_paper" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        title={
          isLoading
            ? "Searching TinyFish"
            : error
              ? "Search failed"
              : query.trim()
                ? "No results found"
                : "Search the web"
        }
        description={
          error || (query.trim() ? "Try another query or adjust the filters." : "Type a query to find results.")
        }
        actions={
          <ActionPanel>
            {error ? <Action title="Retry Search" icon={Icon.ArrowClockwise} onAction={retry} /> : null}
            {searchActions}
          </ActionPanel>
        }
      />
      <List.Section title={summary} subtitle={`${results.length} results`}>
        {results.map((result) => (
          <List.Item
            key={result.url}
            icon={filters.type === "research_paper" ? Icon.Book : Icon.Globe}
            title={result.title}
            subtitle={result.publisher || result.site_name || hostname(result.url)}
            accessories={
              result.year != null ? [{ text: String(result.year) }] : result.date ? [{ text: result.date }] : []
            }
            detail={<List.Item.Detail markdown={formatSearchResult(result)} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={result.url} />
                {result.pdf_url ? <Action.OpenInBrowser title="Open PDF" url={result.pdf_url} /> : null}
                <Action.Push
                  title="Fetch Content"
                  icon={Icon.Document}
                  shortcut={{ macOS: { modifiers: ["cmd"], key: "f" }, Windows: { modifiers: ["ctrl"], key: "f" } }}
                  target={<FetchedPages options={{ urls: [result.url], links: true }} />}
                />
                <Action.CopyToClipboard title="Copy URL" content={result.url} />
                <Action.CopyToClipboard title="Copy Markdown Link" content={`[${result.title}](${result.url})`} />
                <SaveReadingAction url={result.url} title={result.title} />
                <Action.Push
                  title="Fetch with Options"
                  icon={Icon.Gear}
                  target={<FetchPagesForm initialURL={result.url} />}
                />
                <ActionPanel.Section>{searchActions}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {results.length && hasMore ? (
        <List.Item
          id="load-more"
          title={
            isLoading ? "Loading more results…" : error ? "Could not load more results — retry" : "Load More Results"
          }
          icon={Icon.ArrowDown}
          detail={
            <List.Item.Detail
              markdown={error ? `# Could not load more results\n\n${error}` : "Load the next page of search results."}
            />
          }
          actions={<ActionPanel>{searchActions}</ActionPanel>}
        />
      ) : null}
    </List>
  );
}

export default withAccessToken(tinyfish)(Command);
