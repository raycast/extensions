import { Action, ActionPanel, getPreferenceValues, Keyboard } from "@raycast/api";
import { HistoryEntry } from "../interfaces";

const SEARCH_ENGINE_URLS: Record<string, string> = {
  Google: "https://www.google.com/search?q=",
  DuckDuckGo: "https://duckduckgo.com/?q=",
  Bing: "https://www.bing.com/search?q=",
  Baidu: "https://www.baidu.com/s?wd=",
  Brave: "https://search.brave.com/search?q=",
};

const getNewTabTarget = (query?: string): string => {
  if (!query) {
    return "about:newtab";
  }
  const { searchEngine } = getPreferenceValues<Preferences.NewTab>();
  const base = SEARCH_ENGINE_URLS[searchEngine] ?? SEARCH_ENGINE_URLS.Google;
  return base + encodeURIComponent(query);
};

export function NewTabAction({ query }: { query?: string }) {
  return (
    <ActionPanel title="New Tab">
      <Action.Open
        title={query ? `Search "${query}"` : "Open Empty Tab"}
        target={getNewTabTarget(query)}
        application="firefox"
      />
    </ActionPanel>
  );
}

export function HistoryItemAction({ entry: { title, url } }: { entry: HistoryEntry }) {
  return (
    <ActionPanel title={title || url}>
      <Action.Open title="Open in Firefox" target={url} application="firefox" />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={{ modifiers: ["opt"], key: "enter" }} />
    </ActionPanel>
  );
}
