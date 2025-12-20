import { Action, ActionPanel, Icon, Image, List, showHUD, showToast, Toast } from "@raycast/api";
import { BrowserHistory } from "../util/types";
import { useEffect, useState, useRef } from "react";
import { listProfileHistories, openGoogleChrome, parseHistoryResults, formatAsUrl, isValidUrl } from "../util/util";

const HistoryItem = (props: { index: number; history: BrowserHistory; profileDirectory: string }) => {
  const { index, history } = props;
  return (
    <List.Item
      key={index}
      title={history.title}
      subtitle={history.url}
      icon={history.icon ? { source: history.icon, mask: Image.Mask.Circle } : Icon.Globe}
      actions={
        <ActionPanel>
          <Action
            title="Open in Google Chrome"
            icon={Icon.Globe}
            onAction={async () => {
              await openGoogleChrome(props.profileDirectory, history.url, async () => {
                await showHUD("Opening url...");
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
};

// Helper to detect if text looks like a URL or domain
const looksLikeUrl = (text: string): boolean => {
  const trimmed = text.trim();
  // Check if it's already a valid URL
  if (isValidUrl(trimmed)) return true;

  // Check if it looks like a domain or URL without protocol
  const urlPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$|^localhost(:\d+)?(\/.*)?$/;
  return urlPattern.test(trimmed);
};

export const ListHistories = (props: { profileDirectory: string }) => {
  const [histories, setHistories] = useState<BrowserHistory[]>();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [error, setError] = useState<Error>();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchText]);

  useEffect(() => {
    async function listHistories() {
      try {
        const histories = parseHistoryResults(await listProfileHistories(props.profileDirectory, debouncedSearchText));
        setHistories(histories);
      } catch (_error) {
        setError(Error(`Failed to load histories: ${_error instanceof Error ? _error.message : String(_error)}`));
      }
    }

    listHistories();
  }, [debouncedSearchText]);

  if (error) {
    showToast(Toast.Style.Failure, error.message);
  }

  const handleOpenUrlOrSearch = async () => {
    const trimmedText = searchText.trim();
    if (!trimmedText) return;

    const isUrl = looksLikeUrl(trimmedText);
    const urlToOpen = isUrl
      ? formatAsUrl(trimmedText)
      : `https://www.google.com/search?q=${encodeURIComponent(trimmedText)}`;

    await openGoogleChrome(props.profileDirectory, urlToOpen, async () => {
      await showHUD(isUrl ? "Opening URL..." : "Searching Google...");
    });
  };

  return (
    <List
      isLoading={!histories && !error}
      searchBarPlaceholder="Search Histories or Enter URL"
      onSearchTextChange={setSearchText}
    >
      {searchText.trim() && (
        <List.Item
          title={looksLikeUrl(searchText) ? `Open URL: ${searchText}` : `Search Google: ${searchText}`}
          icon={looksLikeUrl(searchText) ? Icon.Link : Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title={looksLikeUrl(searchText) ? "Open URL" : "Search Google"}
                icon={looksLikeUrl(searchText) ? Icon.Globe : Icon.MagnifyingGlass}
                shortcut={{ modifiers: [], key: "tab" }}
                onAction={handleOpenUrlOrSearch}
              />
            </ActionPanel>
          }
        />
      )}
      {histories &&
        histories.map((history, index) => (
          <HistoryItem key={index} profileDirectory={props.profileDirectory} index={index} history={history} />
        ))}
    </List>
  );
};
