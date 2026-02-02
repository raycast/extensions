import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { searchConfluence, ConfluencePage } from "./confluence";
import { MESSAGES } from "./messages";
import { getLanguage } from "./utils";

/**
 * Command for searching Confluence pages.
 * - Provides debounced search as you type.
 * - Displays results with title and author.
 * - Allows opening results in the browser or copying the URL.
 */
export default function ConfluenceCommand() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<ConfluencePage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lang = getLanguage() as keyof typeof MESSAGES.cf;
  const cfMessages = MESSAGES.cf[lang];

  useEffect(() => {
    if (!searchText) {
      setResults([]);
      return;
    }

    // Debounce search by 500ms
    let cancel = false;

    async function search() {
      setLoading(true);
      setError(null);
      try {
        const pages = await searchConfluence(searchText);
        if (!cancel) {
          setResults(pages);
        }
      } catch (e) {
        if (!cancel) {
          console.error(e);
          // Don't show toast for every keystroke error, just set error state or log
          // Only show explicit error if it's a configuration issue or non-transient
          if (e instanceof Error && e.message === "Missing configuration") {
            setError(cfMessages.missing_configuration);
          } else {
            setError(cfMessages.unknown_error);
          }
        }
      } finally {
        if (!cancel) {
          setLoading(false);
        }
      }
    }

    const timeoutId = setTimeout(search, 500); // Debounce 500ms

    return () => {
      cancel = true;
      clearTimeout(timeoutId);
    };
  }, [searchText]);

  return (
    <List isLoading={loading} onSearchTextChange={setSearchText} searchBarPlaceholder={cfMessages.empty_query} throttle>
      {searchText === "" ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={cfMessages.empty_query} />
      ) : error ? (
        <List.EmptyView icon={Icon.Warning} title={cfMessages.error} description={error} />
      ) : results.length === 0 && !loading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={cfMessages.no_results}
          description={cfMessages.no_results_subtitle.replace("{query}", searchText)}
        />
      ) : (
        results.map((page, index) => (
          <List.Item
            key={index}
            icon="../assets/cf.png"
            title={page.title}
            accessories={[{ text: page.author, icon: Icon.Person }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={page.url} title={cfMessages.open_in_browser} />
                <Action.CopyToClipboard content={page.url} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
