import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { describeError, showError } from "../Utils/errors";
import { AdsQueryGeneral, AdsTokenError } from "../Utils/queries";
import { Icons } from "../Utils/icons";
import { OpenDetailsAction } from "./Actions";

const getAuthor = (authors: string[]): string => {
  const getLastname = (fullname: string): string => fullname.trim().split(",")[0];
  if (authors.length > 3) {
    if (authors[0].includes("Collaboration")) {
      return getLastname(authors[0]);
    }
    return getLastname(authors[0]) + ", et al.";
  }
  return authors.map(getLastname).join(", ");
};

const SearchInBrowserAction = ({ query }: { query: string }) => (
  <Action.OpenInBrowser
    title="Search in ADS"
    icon={Icons.Globe}
    url={`https://ui.adsabs.harvard.edu/search/q=${encodeURIComponent(query)}`}
  />
);

/**
 * Type a query in the search bar and press Enter to run it. ADS is only queried
 * on Enter (not while typing), because half-typed queries are often invalid ADS
 * syntax and every request counts against the daily API limit.
 */
export default function AdsSearch({ ads_api_token, path }: { ads_api_token: string; path?: string }) {
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");

  const {
    isLoading,
    data: entries = [],
    error,
    revalidate,
  } = usePromise(AdsQueryGeneral, [query, ads_api_token], {
    execute: query !== "",
    onError: (e) => showError(e, "ADS search failed"),
  });

  const pending = searchText.trim();
  const showSearchItem = pending !== "" && pending !== query;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type an ADS query and press Enter…"
    >
      {query === "" && !showSearchItem ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search NASA ADS"
          description={'Type a query and press Enter, e.g. author:"^Landau" year:1938'}
        />
      ) : null}
      {query !== "" && !isLoading && error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={error instanceof AdsTokenError ? "ADS API Token Rejected" : "ADS Search Failed"}
          description={describeError(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Settings" icon={Icon.Cog} onAction={openExtensionPreferences} />
              <SearchInBrowserAction query={query} />
            </ActionPanel>
          }
        />
      ) : null}
      {query !== "" && !isLoading && !error ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results on ADS"
          description={`Nothing found for: ${query}`}
          actions={
            <ActionPanel>
              <SearchInBrowserAction query={query} />
            </ActionPanel>
          }
        />
      ) : null}

      {showSearchItem ? (
        <List.Item
          icon={Icon.MagnifyingGlass}
          title={`Search ADS for “${pending}”`}
          actions={
            <ActionPanel>
              <Action title="Search ADS" icon={Icon.MagnifyingGlass} onAction={() => setQuery(pending)} />
              <SearchInBrowserAction query={pending} />
            </ActionPanel>
          }
        />
      ) : null}

      <List.Section
        title={query ? `Results for “${query}”` : undefined}
        subtitle={query ? String(entries.length) : undefined}
      >
        {entries.map((d) => (
          <List.Item
            key={d.bibcode}
            title={d.title?.[0] ?? d.bibcode}
            accessories={[{ text: { value: getAuthor(d.author ?? []), color: Color.Blue } }, { text: d.year ?? "" }]}
            actions={
              <ActionPanel>
                <OpenDetailsAction bibcode={d.bibcode} api_token={ads_api_token} path={path} />
                <Action.OpenInBrowser
                  title="Open in ADS"
                  icon={Icons.Globe}
                  url={`https://ui.adsabs.harvard.edu/abs/${d.bibcode}/abstract`}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
