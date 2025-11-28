/**
 * Search URL Command
 *
 * Dedicated command for searching URLs
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
import { isURL } from "./utils/ioc-detection";
import { buildSearchURL } from "./utils/url-builder";
import { ExtensionPreferences, SearchResult } from "./types";
import { getEnabledSourcesForIOCType } from "./utils/osint-sources";

interface SearchURLArguments {
  url?: string;
}

export default function SearchURLCommand(
  props: LaunchProps<{ arguments: SearchURLArguments }>,
) {
  const [searchText, setSearchText] = useState(props.arguments.url || "");
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
        const trimmedURL = searchText.trim();

        // Validate URL
        if (!isURL(trimmedURL)) {
          setIsValid(false);
          setSearchResults([]);
          setIsLoading(false);
          return;
        }

        setIsValid(true);

        // Get enabled sources for URL
        const sources = await getEnabledSourcesForIOCType("url", preferences);

        // Build search results
        const results: SearchResult[] = [];
        for (const source of sources) {
          const url = await buildSearchURL(source.id, trimmedURL, "url");
          results.push({
            source,
            url,
            ioc: trimmedURL,
            iocType: "url",
          });
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Error searching URL:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message:
            error instanceof Error ? error.message : "Failed to search URL",
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
      searchBarPlaceholder="Enter URL (e.g., https://example.com/path)..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {!searchText && (
        <List.EmptyView
          icon={{ source: Icon.Link, tintColor: Color.Orange }}
          title="Search URLs"
          description="Enter a URL to analyze across security platforms"
        />
      )}

      {searchText && !isValid && (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Invalid URL"
          description="Please enter a valid URL (must start with http:// or https://)"
        />
      )}

      {isValid && searchResults.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          title="No Sources Available"
          description="No OSINT sources are enabled for URLs. Check your preferences."
        />
      )}

      {isValid && searchResults.length > 0 && (
        <List.Section title="URL" subtitle={`${searchResults.length} sources`}>
          {searchResults.map((result) => (
            <List.Item
              key={result.source.id}
              id={result.source.id}
              icon={{ source: Icon.Link, tintColor: Color.Orange }}
              title={result.source.name}
              subtitle={result.source.description}
              accessories={[{ text: result.source.category }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title={`Analyze in ${result.source.name}`}
                    url={result.url}
                  />
                  <Action.CopyToClipboard
                    title="Copy Search URL"
                    content={result.url}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={result.ioc}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
