/**
 * Main command: Search Context7 Docs
 * Provides a searchable list of Context7 library documentation
 */

import { useState, useEffect } from "react";
import {
  List,
  showToast,
  Toast,
  openExtensionPreferences,
  Icon,
  ActionPanel,
  Action,
  getPreferenceValues,
  Clipboard,
  Color,
} from "@raycast/api";
import { useContext7Search } from "./hooks/useContext7Search";
import { LibrarySearchResult, Preferences } from "./lib/types";
import { DocDetailView } from "./components/DocDetailView";
import { formatNumber, formatRelativeTime } from "./lib/formatters";
import { getLlmsTxt } from "./lib/api";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, error } = useContext7Search(searchText);
  const preferences = getPreferenceValues<Preferences>();
  const hasApiKey = !!preferences.apiKey;

  // Handle errors with toast notifications
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
        primaryAction: error.showPreferencesLink
          ? {
              title: "Open Preferences",
              onAction: () => openExtensionPreferences(),
            }
          : undefined,
      });
    }
  }, [error]);

  // Sort results by stars (descending), then by trust score (descending)
  const sortedResults = data?.results
    ? [...data.results].sort((a, b) => {
        // First sort by stars (descending)
        if (b.stars !== a.stars) {
          return b.stars - a.stars;
        }
        // If stars are equal, sort by trust score (descending)
        return b.trustScore - a.trustScore;
      })
    : [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Context7 documentation..."
      throttle
    >
      {!searchText.trim() ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Context7 Documentation"
          description={
            hasApiKey
              ? "Type a library name or keyword to search"
              : "Type a library name or keyword to search\n\n💡 Tip: Configure an API Key in preferences for higher rate limits"
          }
        />
      ) : error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Error" description={error.message} />
      ) : isLoading && sortedResults.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching..." description={`Looking for "${searchText}"`} />
      ) : sortedResults.length === 0 ? (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No Results Found"
          description={`No libraries found for "${searchText}"`}
        />
      ) : (
        sortedResults.map((library) => <LibraryItem key={library.id} library={library} />)
      )}
    </List>
  );
}

/**
 * Individual library item in the search results list
 */
function LibraryItem({ library }: { library: LibrarySearchResult }) {
  const preferences = getPreferenceValues<Preferences>();
  const [, setIsLoadingLlms] = useState(false);

  // Format display values (formatNumber handles null/undefined/NaN)
  const starCount = formatNumber(library.stars ?? 0);
  const tokensCount = formatNumber(library.totalTokens ?? 0);
  const snippetsCount = formatNumber(library.totalSnippets ?? 0);
  const updatedTime = formatRelativeTime(library.lastUpdateDate);

  // Create accessories for metadata display using colored tags with emoji
  // Order from right to left: stars, tokens, snippets, updated
  const accessories: List.Item.Accessory[] = [
    {
      tag: { value: `🕐 ${updatedTime}`, color: Color.SecondaryText },
      tooltip: `Last Updated: ${new Date(library.lastUpdateDate).toLocaleDateString()}`,
    },
    {
      tag: { value: `📋 ${snippetsCount}`, color: Color.Green },
      tooltip: "Total Snippets",
    },
    {
      tag: { value: `📝 ${tokensCount}`, color: Color.Blue },
      tooltip: "Total Tokens",
    },
    {
      tag: { value: `⭐ ${starCount}`, color: Color.Yellow },
      tooltip: "GitHub Stars",
    },
  ];

  // Get llms.txt URL with configured tokens
  const tokenLimit = parseInt(preferences.defaultTokens || "10000", 10);
  const llmsTxtUrl = `https://context7.com${library.id}/llms.txt?tokens=${tokenLimit}`;

  // Handle copying llms.txt content
  const handleCopyLlmsTxt = async () => {
    setIsLoadingLlms(true);
    try {
      const content = await getLlmsTxt(library.id);
      await Clipboard.copy(content);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to Clipboard",
        message: "llms.txt content copied successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoadingLlms(false);
    }
  };

  return (
    <List.Item
      icon={Icon.Book}
      title={library.title}
      subtitle={library.description || undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="View Documentation" icon={Icon.Book} target={<DocDetailView library={library} />} />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://context7.com${library.id}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.OpenInBrowser
            title="Open Llms.txt Link"
            url={llmsTxtUrl}
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action
            title="Copy Llms.txt Content"
            icon={Icon.Clipboard}
            onAction={handleCopyLlmsTxt}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={`https://context7.com${library.id}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
        </ActionPanel>
      }
    />
  );
}
