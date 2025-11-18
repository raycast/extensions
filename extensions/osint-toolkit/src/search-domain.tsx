/**
 * Search Domain Command
 *
 * Dedicated command for searching domains
 */

import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { isDomain } from "./utils/ioc-detection";
import { buildSearchURL } from "./utils/url-builder";
import { ExtensionPreferences, SearchResult } from "./types";
import { getEnabledSourcesForIOCType } from "./utils/osint-sources";

interface SearchDomainArguments {
  domain?: string;
}

export default function SearchDomainCommand(
  props: LaunchProps<{ arguments: SearchDomainArguments }>,
) {
  const [searchText, setSearchText] = useState(props.arguments.domain || "");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchText.trim()) {
        setSearchResults([]);
        setIsValid(false);
        return;
      }

      setIsLoading(true);

      try {
        const preferences = getPreferenceValues<ExtensionPreferences>();
        const trimmedDomain = searchText.trim().toLowerCase();

        // Validate domain
        if (!isDomain(trimmedDomain)) {
          setIsValid(false);
          setSearchResults([]);
          setIsLoading(false);
          return;
        }

        setIsValid(true);

        // Get enabled sources for domain
        const sources = await getEnabledSourcesForIOCType(
          "domain",
          preferences,
        );

        // Build search results
        const results: SearchResult[] = [];
        for (const source of sources) {
          const url = await buildSearchURL(source.id, trimmedDomain, "domain");
          results.push({
            source,
            url,
            ioc: trimmedDomain,
            iocType: "domain",
          });
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Error searching domain:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message:
            error instanceof Error ? error.message : "Failed to search domain",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter domain (e.g., example.com)..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {!searchText && (
        <List.EmptyView
          icon={{ source: Icon.Link, tintColor: Color.Green }}
          title="Search Domains"
          description="Enter a domain name to search across threat intelligence platforms"
        />
      )}
      {searchText && !isValid && (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Invalid Domain"
          description="Please enter a valid domain name (e.g., example.com)"
        />
      )}

      {isValid && searchResults.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          title="No Sources Available"
          description="No OSINT sources are enabled for domains. Check your preferences."
        />
      )}

      {isValid && searchResults.length > 0 && (
        <List.Section
          title="Domain"
          subtitle={`${searchResults.length} sources`}
        >
          {searchResults.map((result: SearchResult) => {
            return (
              <List.Item
                key={result.source.id}
                id={result.source.id}
                icon={{ source: Icon.Link, tintColor: Color.Green }}
                title={result.source.name}
                subtitle={result.source.description}
                accessories={[{ text: result.source.category }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title={`Search in ${result.source.name}`}
                      url={result.url}
                    />
                    <Action.CopyToClipboard
                      title="Copy Search URL"
                      content={result.url}
                    />
                    <Action.CopyToClipboard
                      title="Copy Domain"
                      content={result.ioc}
                    />
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
