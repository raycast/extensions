import { useEffect, useRef, useState } from "react";

// Raycast imports
import {
  Action,
  ActionPanel,
  getPreferenceValues,
  List,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  Cache,
} from "@raycast/api";

import { useFetch } from "@raycast/utils";

// types
import { PassageResponse, Passage } from "./types";

import { reorderActions } from "./helpers";

// get user Prefs
const { ESVApiToken, searchMode, defaultAction } = getPreferenceValues<Preferences.PassageLookup>();

// dropdown styling options
import { stylingOptions } from "./stylingOptions";

const cache = new Cache({ namespace: "bible-verses", capacity: 1000000 });

function readCachedPassages(): Passage[] {
  const cached = cache.get("bible-verses");
  return cached ? JSON.parse(cached) : [];
}

export default function EsvSearch() {
  const [prevItems, setPrevItems] = useState<Passage[]>(readCachedPassages);
  const [query, setQuery] = useState("");
  const [fetchQuery, setFetchQuery] = useState("");

  useEffect(() => {
    if (searchMode !== "live") return;
    const timer = setTimeout(() => setFetchQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const [styling, setStyling] = useState(stylingOptions.default.value);

  const handleFetchError = (error: Error) => {
    showToast({
      style: Toast.Style.Failure,
      title: `${error} Check your API Key`,
      message: `Your ESV API token is invalid or you have no internet connection.`,
      primaryAction: {
        title: "Change API Key",
        onAction: () => openExtensionPreferences(),
      },
    });
  };

  const { isLoading, data: passages } = useFetch<PassageResponse>(
    `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(fetchQuery)}${styling}`,
    {
      method: "GET",
      headers: {
        Authorization: `${ESVApiToken}`,
      },
      keepPreviousData: true,
      execute: fetchQuery.length > 0,
      onError: handleFetchError,
    },
  );
  const { data: plainPassages } = useFetch<PassageResponse>(
    `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(fetchQuery)}${stylingOptions.none.value}`,
    {
      method: "GET",
      headers: {
        Authorization: `${ESVApiToken}`,
      },
      execute: fetchQuery.length > 0,
      onError: handleFetchError,
    },
  );
  const [searchResult, setSearchResult] = useState<Passage | undefined>(undefined);
  const lastCanonicalRef = useRef<string>("");

  const clearCache = () => {
    cache.clear();
    setSearchResult(undefined);
    setPrevItems([]);
    cache.set("bible-verses", JSON.stringify([]));
    showToast({
      style: Toast.Style.Success,
      title: `Previous passages removed`,
    });
  };

  const buildPassageActions = (passage: Passage) => {
    const actions = [
      {
        key: "copyStyled",
        element: <Action.CopyToClipboard key="copyStyled" title="Copy Styled Text" content={passage.passage.styled} />,
      },
      {
        key: "pasteStyled",
        element: <Action.Paste key="pasteStyled" title="Paste Styled Text" content={passage.passage.styled} />,
      },
      {
        key: "copyPlain",
        element: (
          <Action.CopyToClipboard
            key="copyPlain"
            title="Copy Plain Text"
            content={passage.passage.plain}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
        ),
      },
      {
        key: "pastePlain",
        element: (
          <Action.Paste
            key="pastePlain"
            title="Paste Plain Text"
            content={passage.passage.plain}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
        ),
      },
      {
        key: "copyRef",
        element: (
          <Action.CopyToClipboard
            key="copyRef"
            title="Copy Reference"
            content={passage.ref}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        ),
      },
    ];
    return (
      <ActionPanel>
        {reorderActions(actions, defaultAction)}
        <Action
          title="Clear Previous Passages"
          onAction={clearCache}
          icon={Icon.Eraser}
          shortcut={{ modifiers: ["opt"], key: "backspace" }}
        />
      </ActionPanel>
    );
  };

  useEffect(() => {
    if (!passages || !plainPassages) return;
    if (passages.canonical === lastCanonicalRef.current) return;
    lastCanonicalRef.current = passages.canonical;

    const passageObject: Passage = {
      id: passages.canonical,
      ref: passages.canonical,
      passage: {
        styled: passages.passages.join("").trim(),
        plain: plainPassages.passages.join("").trim(),
      },
    };
    setSearchResult(passageObject);

    if (passages.passages.length > 0) {
      setPrevItems((prev) => {
        if (prev.some((item) => item.ref === passageObject.ref)) return prev;
        const updated = [passageObject, ...prev];
        cache.set("bible-verses", JSON.stringify(updated));
        return updated;
      });
    }
  }, [passages, plainPassages]);

  return (
    <List
      isLoading={isLoading && fetchQuery.length > 0}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Type one or more Bible references..."
      isShowingDetail={prevItems.length > 0 || (searchMode === "manual" && query.length > 0)}
      selectedItemId={searchResult?.id}
      throttle={searchMode === "live"}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Styling" onChange={(style) => setStyling(style)} storeValue={true}>
          {Object.values(stylingOptions).map((style) => (
            <List.Dropdown.Item title={style.title} value={style.value} key={style.id} />
          ))}
        </List.Dropdown>
      }
    >
      {searchMode === "manual" && query.length > 0 && query !== fetchQuery && (
        <List.Section title="Look Up">
          <List.Item
            title={`Look up: ${query}`}
            icon={Icon.Book}
            detail={<List.Item.Detail markdown={`Press Enter to look up **${query}**`} />}
            actions={
              <ActionPanel>
                <Action title="Look Up Passage" icon={Icon.MagnifyingGlass} onAction={() => setFetchQuery(query)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {!query && prevItems.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type a Bible reference to get started"
          description="e.g., John 3:16, 1 John 1:1"
        />
      )}
      {searchResult && searchResult?.passage?.styled.length !== 0 && prevItems.length > 0 && (
        <List.Section title="Current Passage">
          <List.Item
            title={searchResult.ref}
            icon={Icon.Book}
            id={searchResult.id}
            detail={<List.Item.Detail markdown={searchResult.passage.styled} />}
            actions={buildPassageActions(searchResult)}
          />
        </List.Section>
      )}
      {searchResult &&
        searchResult?.passage?.styled.length === 0 &&
        (prevItems.length === 0 ? (
          <List.EmptyView
            icon={Icon.XMarkCircle}
            title="No result found"
            description="Please try another reference search (e.g., Genesis 1:1)"
          />
        ) : (
          <List.Section title="No result found">
            <List.Item title="Please try another search" icon={Icon.XMarkCircle} />
          </List.Section>
        ))}
      <List.Section title="Previous Passages">
        {prevItems
          .filter((i: Passage) => i.ref !== searchResult?.ref)
          .map((item: Passage) => (
            <List.Item
              key={item.id}
              title={item.ref}
              icon={Icon.Book}
              detail={<List.Item.Detail markdown={item.passage.styled} />}
              actions={buildPassageActions(item)}
            />
          ))}
      </List.Section>
    </List>
  );
}

// Before MVP

// 1. Change styling options for selected previous items? (⛔)
// 2. Auto select new queries
