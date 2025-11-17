import { ActionPanel, Action, List, Cache, getPreferenceValues, showToast, Toast, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useRef, useEffect, useMemo } from "react";
import { URLSearchParams } from "node:url";

const cache = new Cache();

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [metadata, setMetadata] = useState<ResultMetadata>({ source: null });
  const startTimeRef = useRef<number | null>(null);

  // get cache for selected language
  const cacheKey = `${preferences.language}:${searchText.toLowerCase()}`;

  useEffect(() => {
    if (!searchText) {
      setMetadata({ source: null });
      return;
    }
    // check for word in cache
    const isCached = cache.get(cacheKey);
    setMetadata({ source: isCached ? "cache" : null });
  }, [searchText, preferences.language]);

  const { data, isLoading } = useFetch<SearchResult[]>(
    "https://api.datamuse.com/words?" +
      // send the search query to the API
      new URLSearchParams({ sp: searchText.toLowerCase(), v: preferences.language === "es" ? "es" : "enwiki" }),
    {
      keepPreviousData: true, // removes flickering
      execute: searchText.length > 0 && !cache.get(cacheKey),
      onWillExecute: () => {
        // start timer
        startTimeRef.current = performance.now();
      },
      onData: (fetchedData) => {
        if (startTimeRef.current) {
          const duration = performance.now() - startTimeRef.current;
          setMetadata({ source: "network", duration: duration });
        }
        cache.set(cacheKey, JSON.stringify(fetchedData));
      },
      initialData: cache.get(cacheKey) ? JSON.parse(cache.get(cacheKey) as string) : undefined,
      parseResponse: parseFetchResponse,
    },
  );

  const displayData = useMemo(() => {
    if (!data) {
      return [];
    }

    // Determine the casing style
    const isAllCaps = searchText.length > 0 && searchText === searchText.toUpperCase();
    const isTitleCase = searchText.length > 0 && !isAllCaps && searchText[0] === searchText[0].toUpperCase();

    // Transform the lowercase data from the API/cache
    return data.map((result) => {
      let displayWord = result.word;
      if (isAllCaps) {
        displayWord = result.word.toUpperCase();
      } else if (isTitleCase) {
        // Capitalize the first letter and keep the rest
        displayWord = result.word.charAt(0).toUpperCase() + result.word.slice(1);
      }
      return { ...result, word: displayWord };
    });
  }, [data, searchText]);

  const subtitleParts = [`${data?.length ?? 0} Found`];
  if (metadata.source === "cache") {
    subtitleParts.push("(cache)");
  } else if (metadata.source === "network" && metadata.duration !== undefined) {
    subtitleParts.push(`in ${metadata.duration.toFixed(1)}ms`);
  }

  // Only show the loading indicator if we are actually fetching from the network
  const listIsLoading = isLoading && metadata.source !== "cache";
  // Clear list when search bar is empty
  const results = searchText ? displayData : [];

  return (
    <List
      isLoading={listIsLoading}
      onSearchTextChange={setSearchText}
      selectedItemId="0" // selection workaround
      searchBarPlaceholder={preferences.language === "es" ? "Search Spanish words..." : "Search English words..."}
    >
      <List.Section title="Results" subtitle={subtitleParts.join(" ")}>
        {results.map((searchResult, index) => (
          <SearchListItem key={searchResult.word} searchResult={searchResult} id={index.toString()} />
        ))}
      </List.Section>
    </List>
  );
}

async function handleClearCache() {
  await showToast({
    style: Toast.Style.Animated,
    title: "Clearing cache...",
  });
  cache.clear();
  await showToast({
    style: Toast.Style.Success,
    title: "Cache Cleared",
  });
}

function SearchListItem({ searchResult, id }: { searchResult: SearchResult; id: string }) {
  return (
    <List.Item
      id={id}
      title={searchResult.word}
      subtitle={searchResult.score.toString()}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Word" content={searchResult.word} icon={Icon.CopyClipboard} />
            <Action.Paste
              title="Paste Word"
              content={searchResult.word}
              shortcut={{ modifiers: ["shift"], key: "enter" }}
              icon={Icon.TextInput}
            />
            <Action
              title="Clear Cache"
              onAction={handleClearCache}
              shortcut={{ modifiers: ["shift"], key: "delete" }}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as
    | {
        word: string;
        score: number;
      }[]
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.map((result) => {
    return {
      word: result.word,
      score: result.score,
    } as SearchResult;
  });
}

interface SearchResult {
  word: string;
  score: number;
}

interface ResultMetadata {
  source: "cache" | "network" | null;
  duration?: number;
}

interface Preferences {
  language: "en" | "es";
}
