import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import { runAppleScript } from "@raycast/utils";
import {
  SearchResult,
  getChromeProfilePath,
  getChromeBookmarks,
  getChromeHistory,
  deduplicateResults,
  parseTabOutput,
  parseTabContentOutput,
  mergeContentIntoResults,
  extractDomain,
} from "./chrome-utils";
import { filterResults, FilteredResult } from "./search-utils";

// ─── Source Icon & Tag ───────────────────────────────────────
function getSourceIcon(source: "tab" | "bookmark" | "history"): Icon {
  switch (source) {
    case "tab":
      return Icon.Globe;
    case "bookmark":
      return Icon.Bookmark;
    case "history":
      return Icon.Clock;
  }
}

function getSourceTag(source: "tab" | "bookmark" | "history"): {
  value: string;
  color: Color;
} {
  switch (source) {
    case "tab":
      return { value: "Tab", color: Color.Green };
    case "bookmark":
      return { value: "Bookmark", color: Color.Blue };
    case "history":
      return { value: "History", color: Color.Orange };
  }
}

// ─── Tab Fetching via AppleScript ────────────────────────────
async function getChromeTabs(): Promise<SearchResult[]> {
  try {
    const script = `
      set output to ""
      tell application "Google Chrome"
        set windowCount to count of windows
        repeat with w from 1 to windowCount
          set tabCount to count of tabs of window w
          repeat with t from 1 to tabCount
            set tabTitle to title of tab t of window w
            set tabURL to URL of tab t of window w
            set output to output & w & "|||" & t & "|||" & tabTitle & "|||" & tabURL & "\\n"
          end repeat
        end repeat
      end tell
      return output
    `;

    const result = await runAppleScript(script);
    return parseTabOutput(result);
  } catch (error) {
    console.error("Error fetching Chrome tabs:", error);
    return [];
  }
}

// ─── Tab Content Fetching via AppleScript ────────────────────
const MAX_TABS_FOR_CONTENT = 30; // Limit to prevent timeout
const MAX_CONTENT_LENGTH = 5000; // Characters per tab

async function getTabContents(): Promise<string> {
  try {
    const script = `
      set output to ""
      set tabsProcessed to 0
      set maxTabs to ${MAX_TABS_FOR_CONTENT}
      tell application "Google Chrome"
        repeat with w from 1 to (count of windows)
          if tabsProcessed >= maxTabs then exit repeat
          repeat with t from 1 to (count of tabs of window w)
            if tabsProcessed >= maxTabs then exit repeat
            try
              set tabURL to URL of tab t of window w
              -- Skip non-http URLs (chrome://, file://, etc.)
              if tabURL starts with "http" then
                try
                  with timeout of 1 seconds
                    set pageContent to execute tab t of window w javascript "
                      (function() {
                        try {
                          var text = document.body ? document.body.innerText : '';
                          return text.substring(0, ${MAX_CONTENT_LENGTH}).replace(/[\\n\\r]+/g, ' ').replace(/\\|\\|\\|/g, '   ');
                        } catch(e) { return ''; }
                      })()
                    "
                  end timeout
                  if pageContent is not missing value and pageContent is not "" then
                    set output to output & w & "|||" & t & "|||" & pageContent & "\\n"
                  end if
                end try
                set tabsProcessed to tabsProcessed + 1
              end if
            end try
          end repeat
        end repeat
      end tell
      return output
    `;

    return await runAppleScript(script);
  } catch (error) {
    console.error("Error fetching tab contents:", error);
    return "";
  }
}

// ─── Switch to Tab via AppleScript ───────────────────────────
async function switchToTab(
  windowIndex: number,
  tabIndex: number,
): Promise<void> {
  const script = `
    tell application "Google Chrome"
      set active tab index of window ${windowIndex} to ${tabIndex}
      set index of window ${windowIndex} to 1
      activate
    end tell
  `;
  await runAppleScript(script);
}

// ─── Open URL in Chrome ──────────────────────────────────────
async function openUrlInChrome(url: string): Promise<void> {
  const script = `
    tell application "Google Chrome"
      open location "${url.replace(/"/g, '\\"')}"
      activate
    end tell
  `;
  await runAppleScript(script);
}

// ─── Main Command ────────────────────────────────────────────
export default function Command() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [searchText, setSearchText] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const profilePath = getChromeProfilePath();

      // Phase 1: Load tab metadata, bookmarks, and history in parallel
      const [tabs, bookmarks, history] = await Promise.all([
        getChromeTabs(),
        Promise.resolve(getChromeBookmarks(profilePath)),
        Promise.resolve(getChromeHistory(500, profilePath)),
      ]);

      // Combine and deduplicate (tabs have highest priority)
      const combined = [...tabs, ...bookmarks, ...history];
      const deduplicated = deduplicateResults(combined);

      setResults(deduplicated);
      setIsLoading(false);

      // Phase 2: Load tab content in background
      setIsLoadingContent(true);
      try {
        const contentOutput = await getTabContents();
        const contents = parseTabContentOutput(contentOutput);
        if (contents.length > 0) {
          setResults((currentResults) =>
            mergeContentIntoResults(currentResults, contents),
          );
        }
      } catch (error) {
        console.error("Error loading tab content:", error);
        // Silent failure - content search just won't be available
      } finally {
        setIsLoadingContent(false);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load Chrome data",
        message: String(error),
      });
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter results based on search text (word-order-independent)
  const filteredResults = useMemo(() => {
    return filterResults(results, searchText);
  }, [results, searchText]);

  // Group filtered results by source
  const tabs = useMemo(
    () => filteredResults.filter((r) => r.source === "tab"),
    [filteredResults],
  );
  const bookmarks = useMemo(
    () => filteredResults.filter((r) => r.source === "bookmark"),
    [filteredResults],
  );
  const historyItems = useMemo(
    () => filteredResults.filter((r) => r.source === "history"),
    [filteredResults],
  );

  return (
    <List
      isLoading={isLoading || isLoadingContent}
      searchBarPlaceholder="Search tabs, bookmarks, and history..."
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.EmptyView
        icon={Icon.Globe}
        title="No Results Found"
        description="Try a different search, or check that Chrome is running."
      />

      <List.Section title="Open Tabs" subtitle={`${tabs.length} tabs`}>
        {tabs.map((result) => (
          <ResultItem
            key={result.id}
            result={result}
            onTabSwitch={switchToTab}
            onOpenUrl={openUrlInChrome}
            onRefresh={loadData}
          />
        ))}
      </List.Section>

      <List.Section
        title="Bookmarks"
        subtitle={`${bookmarks.length} bookmarks`}
      >
        {bookmarks.map((result) => (
          <ResultItem
            key={result.id}
            result={result}
            onTabSwitch={switchToTab}
            onOpenUrl={openUrlInChrome}
            onRefresh={loadData}
          />
        ))}
      </List.Section>

      <List.Section title="History" subtitle={`${historyItems.length} entries`}>
        {historyItems.map((result) => (
          <ResultItem
            key={result.id}
            result={result}
            onTabSwitch={switchToTab}
            onOpenUrl={openUrlInChrome}
            onRefresh={loadData}
          />
        ))}
      </List.Section>

      {searchText.trim() && (
        <List.Section title="Web Search">
          <List.Item
            title={`Search Google for "${searchText.trim()}"`}
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action
                  title="Search in Google"
                  icon={Icon.MagnifyingGlass}
                  onAction={async () => {
                    const query = encodeURIComponent(searchText.trim());
                    await openUrlInChrome(
                      `https://www.google.com/search?q=${query}`,
                    );
                    await closeMainWindow();
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

// ─── Result List Item ────────────────────────────────────────
function ResultItem({
  result,
  onTabSwitch,
  onOpenUrl,
  onRefresh,
}: {
  result: FilteredResult;
  onTabSwitch: (windowIndex: number, tabIndex: number) => Promise<void>;
  onOpenUrl: (url: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const tag = getSourceTag(result.source);
  const domain = extractDomain(result.url);

  // Determine icon: use favicon if available, fall back to source icon
  const icon = result.favicon
    ? { source: result.favicon, fallback: getSourceIcon(result.source) }
    : getSourceIcon(result.source);

  // Build accessories array - include content match tag if applicable
  const accessories: List.Item.Accessory[] = [];
  if (result.isContentMatch) {
    accessories.push({ tag: { value: "Content Match", color: Color.Purple } });
  }
  accessories.push({ tag });

  // Determine subtitle - show content snippet for content matches, otherwise domain
  const subtitle =
    result.isContentMatch && result.contentSnippet
      ? result.contentSnippet
      : domain;

  return (
    <List.Item
      title={result.title || "Untitled"}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {result.source === "tab" &&
            result.windowIndex &&
            result.tabIndex ? (
              <Action
                title="Switch to Tab"
                icon={Icon.Globe}
                onAction={async () => {
                  await onTabSwitch(result.windowIndex!, result.tabIndex!);
                  await closeMainWindow();
                  showToast({
                    style: Toast.Style.Success,
                    title: `Switched to: ${result.title}`,
                  });
                }}
              />
            ) : (
              <Action
                title="Open in Chrome"
                icon={Icon.Globe}
                onAction={async () => {
                  await onOpenUrl(result.url);
                  await closeMainWindow();
                  showToast({
                    style: Toast.Style.Success,
                    title: `Opening: ${result.title}`,
                  });
                }}
              />
            )}
            <Action.OpenInBrowser
              title="Open in Default Browser"
              url={result.url}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              content={result.url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh Data"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
