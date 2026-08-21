import { Action, ActionPanel, Icon, LaunchProps, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import { invalidateApexCache, searchApex } from "./api";

const PAGE_SIZE = 100;

function formatFirstSeen(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchApex }>) {
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { data, error, isLoading, revalidate } = useCachedPromise(searchApex, [props.arguments.apex], {
    keepPreviousData: true,
    failureToastOptions: { title: "Couldn’t Search Apex" },
  });

  const apex = data?.apex ?? props.arguments.apex.trim();
  const results = data?.results ?? [];
  const filteredResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return query ? results.filter((result) => result.subdomain.toLowerCase().includes(query)) : results;
  }, [results, searchText]);
  const visibleResults = filteredResults.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchText]);

  function refreshResults() {
    invalidateApexCache(apex);
    revalidate();
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
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
                    <Action.OpenInBrowser title="Open Subdomain" icon={Icon.Globe} url={url} />
                    <Action.CopyToClipboard title="Copy Subdomain" content={result.subdomain} />
                    <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
                    <ActionPanel.Section>
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
