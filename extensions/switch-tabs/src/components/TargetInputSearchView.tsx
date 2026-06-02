import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import React, { useState, useEffect, useRef } from "react";
import { DisplayTab, SearchInput } from "../types";
import { forceCopy } from "../helpers";

import { searchTargetingListeners, globalSocket } from "../context/BrowserStore";

interface SuggestionResult {
  id: string;
  query: string;
}

// V-CORE: Zero-Latency Session Cache for suggestions
const suggestionCache = new Map<string, SuggestionResult[]>();

// V-CORE: Optimized Action Panel for Target Input Search
const TargetInputActionPanel = React.memo(
  ({
    query,
    hasTarget,
    onSurgicalSearch,
    onSetQuery,
  }: {
    query: string;
    hasTarget: boolean;
    onSurgicalSearch: (q: string) => void;
    onSetQuery?: (q: string) => void;
  }) => (
    <ActionPanel>
      {hasTarget && (
        <Action
          title="Fill & Submit"
          icon={{ source: Icon.Terminal, tintColor: Color.Green }}
          onAction={() => onSurgicalSearch(query)}
        />
      )}
      {onSetQuery && (
        <Action
          title="Edit Query"
          icon={{ source: Icon.Pencil, tintColor: Color.Purple }}
          onAction={() => onSetQuery(query)}
        />
      )}
      <Action
        title="Copy Text"
        icon={{ source: Icon.CopyClipboard, tintColor: Color.SecondaryText }}
        shortcut={{ modifiers: ["shift"], key: "c" }}
        onAction={() => {
          forceCopy(query);
          showToast({ style: Toast.Style.Success, title: "Copied", message: query });
        }}
      />
    </ActionPanel>
  ),
);

export function TargetInputSearchView({
  tab,
  prefilledText = "",
  onSearchComplete,
}: {
  tab: DisplayTab;
  prefilledText?: string;
  onSearchComplete?: () => void;
}) {
  const { pop } = useNavigation();

  // Surgical Targeting State
  const [searchInputs, setSearchInputs] = useState<SearchInput[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<string>("");
  const [isTargetingLoading, setIsTargetingLoading] = useState(true);

  const [listKey] = useState(0);

  // V-CORE: Lightweight Site-Aware Suggestions
  const [searchText, setSearchText] = useState(prefilledText);
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [searchContext, setSearchContext] = useState({ label: "Google", url: "https://www.google.com/search?q=" });
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // V-CORE: Progressive Site-Aware Fetcher (Performance Optimized)
  useEffect(() => {
    const query = searchText.trim();

    // 1. SITE DETECTION (Critical: Must happen before cache exit)
    let searchLabel = "Google";
    let searchBase = "https://www.google.com/search?q=";
    try {
      if (tab.url) {
        const url = new URL(tab.url);
        const host = url.hostname;
        if (host.includes("music.youtube.com")) {
          searchLabel = "YouTube Music";
          searchBase = "https://music.youtube.com/search?q=";
        } else if (host.includes("youtube.com")) {
          searchLabel = "YouTube";
          searchBase = "https://www.youtube.com/results?search_query=";
        }
      }
    } catch {
      /* ignore parse errors */
    }

    setSearchContext({ label: searchLabel, url: searchBase });

    if (!query) {
      setSuggestions([]);
      setIsSuggestLoading(false);
      return;
    }

    // --- INSTANT CACHE HIT ---
    const cacheKey = `${searchLabel}:${query}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setIsSuggestLoading(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    setIsSuggestLoading(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        // V-CORE: Dynamic Suggestion Engine - Use genuine Google/YouTube clients
        const isYT = searchLabel.includes("YouTube");
        const client = isYT ? "youtube" : "chrome";
        const ds = isYT ? "&ds=yt" : "";
        const endpoint = `https://suggestqueries.google.com/complete/search?client=${client}${ds}&q=${encodeURIComponent(query)}`;

        const response = await fetch(endpoint, { signal });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const text = await response.text();
        const jsonStr = text.startsWith("window.google")
          ? text.replace(/^window\.google\.ac\.[hi]\(/, "").replace(/\)$/, "")
          : text;

        const data = JSON.parse(jsonStr);
        const rawSuggestions = data[1] || [];

        // Normalize (YT returns nested arrays, Firefox returns flat strings)
        const normalized = rawSuggestions.map((s: string | unknown[]) => {
          const q = typeof s === "string" ? s : Array.isArray(s) && typeof s[0] === "string" ? s[0] : "";
          return { id: q, query: q };
        });

        if (!signal.aborted) {
          suggestionCache.set(cacheKey, normalized);
          setSuggestions(normalized);
          setIsSuggestLoading(false);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        console.error("Surgical Suggest Error:", e);
        setIsSuggestLoading(false);
      }
    }, 50); // V-CORE: Slashed debounce to 50ms

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, [searchText, tab.url]);

  useEffect(() => {
    // 1. Initiate Surgical Scan
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
      globalSocket.send(JSON.stringify({ type: "INIT_SEARCH_TARGETING", tabId: tab.id }));
    }

    // 2. Listen for Scan Results
    const listener = (msg: { tabId: string | number; inputs: SearchInput[] }) => {
      // Ensure the response is for our currently focused tab
      if (String(msg.tabId) === String(tab.id)) {
        setSearchInputs(msg.inputs || []);
        if (msg.inputs && msg.inputs.length > 0) {
          const firstInput = msg.inputs[0];
          setSelectedInputId(firstInput.id);

          // --- PRE-FILL SYNC ---
          // Seed the search bar with whatever text is already in the website's field (e.g. "frizz")
          if (firstInput.value && firstInput.value.length > 0 && !searchText) {
            setSearchText(firstInput.value);
          }
        }
        setIsTargetingLoading(false);
      }
    };
    searchTargetingListeners.add(listener);

    // 3. Cleanup & Purge Scripts on Unmount
    return () => {
      searchTargetingListeners.delete(listener);
      if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
        globalSocket.send(JSON.stringify({ type: "STOP_SEARCH_TARGETING", tabId: tab.id }));
      }
    };
  }, [tab.id]);

  const handleSurgicalSearch = (query: string) => {
    if (!selectedInputId) {
      showToast(Toast.Style.Failure, "No target input box selected.");
      return;
    }

    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
      globalSocket.send(
        JSON.stringify({
          type: "EXECUTE_SEARCH",
          tabId: tab.id,
          inputId: selectedInputId,
          query: query,
        }),
      );
      showToast(Toast.Style.Success, `Submitted search directly to tab`);
      onSearchComplete?.();
      pop();
    }
  };

  const hasTarget = searchInputs.length > 0;

  return (
    <List
      key={listKey}
      navigationTitle={tab.displayTitle}
      isLoading={isSuggestLoading || isTargetingLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={(text: string) => {
        const clearKey = (getPreferenceValues() as { clearSearchKey?: string }).clearSearchKey || "'";
        if (text === clearKey || text.endsWith(clearKey)) {
          pop();
          return;
        }
        setSearchText(text);
      }}
      searchBarPlaceholder={
        isTargetingLoading
          ? "Waiting for Form Fields..."
          : searchInputs.find((i) => i.id === selectedInputId)?.label || `Search ${tab.displayTitle}...`
      }
      throttle={false}
      searchBarAccessory={
        searchInputs.length > 1 ? (
          <List.Dropdown tooltip="Select Target Search Box" value={selectedInputId} onChange={setSelectedInputId}>
            {searchInputs.map((input) => (
              <List.Dropdown.Item key={input.id} title={input.label} value={input.id} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {/* ─── Static Search Result (What you typed) ─── */}
      {searchText.trim().length > 0 && (
        <List.Item
          key="static-search"
          icon={{ source: Icon.ArrowRightCircleFilled, tintColor: Color.Green }}
          title={searchText}
          subtitle={hasTarget ? `Search ${searchContext.label}` : `No Input Found`}
          accessories={hasTarget ? [{ tag: { value: "Surgical Target", color: Color.Green } }] : []}
          actions={
            <TargetInputActionPanel query={searchText} hasTarget={hasTarget} onSurgicalSearch={handleSurgicalSearch} />
          }
        />
      )}

      {/* ─── Site-Aware Suggestions ─── */}
      {suggestions.map((suggestion) => (
        <List.Item
          key={suggestion.id}
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          title={suggestion.query}
          accessories={[]}
          actions={
            <TargetInputActionPanel
              query={suggestion.query}
              hasTarget={hasTarget}
              onSurgicalSearch={handleSurgicalSearch}
              onSetQuery={setSearchText}
            />
          }
        />
      ))}
    </List>
  );
}
