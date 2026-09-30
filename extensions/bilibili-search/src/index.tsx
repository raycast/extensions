import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  getPreferenceValues,
  Clipboard,
  LocalStorage,
  showToast,
  Toast,
  Keyboard,
  open,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtensionPreferences {
  rememberSearchHistory: boolean;
  useClipboardFallback: boolean;
}

interface SuggestItem {
  keyword: string;
  // raw title may contain <em> tags from B站 API
  title: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_KEY = "bilibili_search_history";
const MAX_HISTORY = 10;
const SUGGEST_URL = "https://s.search.bilibili.com/main/suggest";
const SEARCH_BASE = "https://search.bilibili.com/all";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSearchUrl(query: string): string {
  return `${SEARCH_BASE}?keyword=${encodeURIComponent(query)}`;
}

/** Strip <em>…</em> tags that B站 returns for keyword highlighting */
function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, "");
}

async function fetchSuggestions(query: string): Promise<SuggestItem[]> {
  if (!query.trim()) return [];
  try {
    const url = `${SUGGEST_URL}?term=${encodeURIComponent(query)}&main_ver=v1&highlight=&userid=&bangumi_acc_num=1&special_acc_num=1&topic_acc_num=1&upuser_acc_num=3&tag_num=10&special_num=10&bangumi_num=10&upuser_num=3`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.bilibili.com/",
      },
    });

    if (!res.ok) return [];

    const json = (await res.json()) as {
      result?: {
        tag?: Array<{ value: string; ref: number; name: string }>;
      };
    };

    const tags = json?.result?.tag ?? [];
    return tags.map((t) => ({
      keyword: t.value,
      title: t.name,
    }));
  } catch {
    return [];
  }
}

async function loadHistory(): Promise<string[]> {
  try {
    const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function saveToHistory(query: string, enabled: boolean): Promise<void> {
  if (!enabled || !query.trim()) return;
  try {
    const history = await loadHistory();
    const deduped = [query, ...history.filter((h) => h !== query)].slice(0, MAX_HISTORY);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(deduped));
  } catch {
    // silently ignore storage errors
  }
}

async function removeFromHistory(query: string): Promise<string[]> {
  const history = await loadHistory();
  const updated = history.filter((h) => h !== query);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Command() {
  const prefs = getPreferenceValues<ExtensionPreferences>();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: load history & optionally apply clipboard fallback
  useEffect(() => {
    (async () => {
      if (prefs.rememberSearchHistory) {
        const h = await loadHistory();
        setHistory(h);
      }

      if (prefs.useClipboardFallback) {
        try {
          const text = await Clipboard.readText();
          if (text && text.trim()) {
            setQuery(text.trim());
          }
        } catch {
          // clipboard read failed — no problem
        }
      }
    })();
  }, []);

  // Debounced suggestion fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const currentQuery = query;
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(currentQuery);
      if (currentQuery === query) {
        setSuggestions(results);
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleOpen(searchQuery: string) {
    await saveToHistory(searchQuery, prefs.rememberSearchHistory);
    if (prefs.rememberSearchHistory) {
      const updated = await loadHistory();
      setHistory(updated);
    }
  }

  async function handleDeleteHistory(item: string) {
    const updated = await removeFromHistory(item);
    setHistory(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Removed",
      message: item,
    });
  }

  async function handleClearAllHistory() {
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify([]));
    setHistory([]);
    await showToast({
      style: Toast.Style.Success,
      title: "Search History Cleared",
    });
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!query.trim()) {
    // Show history if available, otherwise show empty view
    if (prefs.rememberSearchHistory && history.length > 0) {
      return (
        <List
          searchBarPlaceholder="Search Bilibili..."
          onSearchTextChange={setQuery}
          throttle={false}
          searchText={query}
        >
          <List.Section title="Recent Searches">
            {history.map((h) => (
              <List.Item
                key={h}
                title={h}
                icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Search" url={buildSearchUrl(h)} onOpen={() => handleOpen(h)} />
                    <Action.CopyToClipboard
                      title="Copy Search URL"
                      content={buildSearchUrl(h)}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Remove from History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={() => handleDeleteHistory(h)}
                      />
                      <Action
                        title="Clear All History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                        onAction={handleClearAllHistory}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </List>
      );
    }

    return (
      <List
        searchBarPlaceholder="Search Bilibili..."
        onSearchTextChange={setQuery}
        throttle={false}
        searchText={query}
      />
    );
  }

  // ── Active search ────────────────────────────────────────────────────────────
  const allItems: Array<{ keyword: string; isSuggestion: boolean }> = [
    { keyword: query.trim(), isSuggestion: false },
    ...suggestions
      .map((s) => ({
        keyword: stripTags(s.keyword || s.title),
        isSuggestion: true,
      }))
      .filter((s) => s.keyword !== query.trim()),
  ];

  return (
    <List
      searchBarPlaceholder="Search Bilibili..."
      onSearchTextChange={setQuery}
      throttle={false}
      isLoading={isLoading}
      searchText={query}
    >
      {allItems.map((item, idx) => (
        <List.Item
          key={`${item.keyword}-${idx}`}
          title={item.keyword}
          icon={
            item.isSuggestion
              ? { source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }
              : { source: Icon.MagnifyingGlass, tintColor: Color.Blue }
          }
          actions={
            <ActionPanel>
              <Action
                title="Open in Browser"
                icon={Icon.Globe}
                onAction={async () => {
                  await saveToHistory(item.keyword, prefs.rememberSearchHistory);
                  await open(buildSearchUrl(item.keyword));
                  await closeMainWindow();
                }}
              />
              <Action.CopyToClipboard
                title="Copy Search URL"
                content={buildSearchUrl(item.keyword)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
