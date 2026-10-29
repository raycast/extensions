import { Action, ActionPanel, Icon, LaunchProps, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import { invalidateApexCache, searchApex } from "./api";
import { filterSubdomains, sortSubdomains, SortOrder, subdomainsToClipboard } from "./subdomains";

const PAGE_SIZE = 100;

function formatFirstSeen(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchApex }>) {
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<SortOrder>("first-seen-ascending");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { data, error, isLoading, revalidate } = useCachedPromise(searchApex, [props.arguments.apex], {
    keepPreviousData: true,
    failureToastOptions: { title: "Couldn’t Search Apex" },
  });

  const apex = data?.apex ?? props.arguments.apex.trim();
  const results = useMemo(() => sortSubdomains(data?.results ?? [], sort), [data, sort]);
  const filteredResults = useMemo(() => filterSubdomains(results, searchText), [results, searchText]);
  const allSubdomains = useMemo(() => subdomainsToClipboard(results), [results]);
  const visibleResults = filteredResults.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchText, sort, data]);

  function refreshResults() {
    invalidateApexCache(apex);
    revalidate();
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort Subdomains" value={sort} onChange={(value) => setSort(value as SortOrder)}>
          <List.Dropdown.Item title="First Seen: Oldest First" value="first-seen-ascending" />
          <List.Dropdown.Item title="First Seen: Newest First" value="first-seen-descending" />
          <List.Dropdown.Item title="Alphabetical" value="alphabetical" />
        </List.Dropdown>
      }
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Filter ${apex} subdomains…`}
      pagination={{
        hasMore: visibleCount < filteredResults.length,
        pageSize: PAGE_SIZE,
        onLoadMore: () => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredResults.length)),
      }}
    >
      {!isLoading && visibleResults.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.MagnifyingGlass}
          title={error ? "Search Failed" : searchText ? "No Matching Subdomains" : "No Subdomains Found"}
          description={
            error
              ? error.message
              : searchText
                ? `No indexed subdomains match “${searchText}”.`
                : `crt.name has no indexed subdomains for ${apex}.`
          }
          actions={
            error ? (
              <ActionPanel>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <Action.OpenInBrowser title="Open Crt.name" url="https://crt.name/" />
              </ActionPanel>
            ) : results.length > 0 ? (
              <ActionPanel>
                <Action.CopyToClipboard title="Copy All Subdomains" content={allSubdomains} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        <List.Section
          title={
            searchText
              ? `${filteredResults.length.toLocaleString()} of ${results.length.toLocaleString()} Subdomains`
              : `${results.length.toLocaleString()} Subdomains`
          }
        >
          {visibleResults.map((result) => {
            const url = `https://${result.subdomain}`;
            const isWildcard = result.subdomain.includes("*");

            return (
              <List.Item
                key={result.subdomain}
                icon={Icon.Globe}
                title={result.subdomain}
                keywords={[result.subdomain.replace(`.${apex}`, "")]}
                accessories={[
                  {
                    text: formatFirstSeen(result.firstSeen),
                    tooltip: "First seen in the crt.name index",
                  },
                ]}
                actions={
                  <ActionPanel>
                    {!isWildcard && <Action.OpenInBrowser title="Open Subdomain" icon={Icon.Globe} url={url} />}
                    <Action.CopyToClipboard title="Copy Subdomain" content={result.subdomain} />
                    {!isWildcard && (
                      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
                    )}
                    <ActionPanel.Section>
                      <Action.CopyToClipboard title="Copy All Subdomains" content={allSubdomains} />
                      <Action title="Refresh Results" icon={Icon.ArrowClockwise} onAction={refreshResults} />
                      <Action.OpenInBrowser title="Open Crt.name" url="https://crt.name/" />
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
