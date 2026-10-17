import { Action, ActionPanel, Icon, Keyboard, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

import { resToDetail } from "@/utils/common";
import {
  Suggestion,
  WordDictionaryProps,
  BackupAPIResponse,
  RedFoxAPIResponse,
  RecentSearch,
  ResultDetailProps,
} from "@/types";

const RECENT_SEARCH_LIMIT = 10;

export default function WordDictionary(props: WordDictionaryProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  async function search(query: string) {
    setSearchQuery(query);
    if (!query) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        encodeURI(`https://api.redfoxsanakirja.fi/redfox-api/api/basic/autocomplete/${props.from}/${query}`),
      );
      const data = (await res.json()) as string[];
      if (data && data.length > 0) {
        const sugg = data.map((item: string) => ({
          title: item,
          url: `https://redfoxsanakirja.fi/fi/sanakirja/-/s/${props.from}/${props.to}/${item}`,
          detail: undefined,
        }));
        setSuggestions(sugg);
      } else {
        const backupRes = await fetch(
          encodeURI(`https://api.redfoxsanakirja.fi/redfox-api/api/basic/query/${props.from}/${props.to}/${query}`),
        );
        const backup = (await backupRes.json()) as BackupAPIResponse;
        if (!backup || !backup.subtitleResult || !backup.subtitleResult.query || !backup.subtitleResult.query.word2) {
          setSuggestions([]);
          return;
        }
        const backupSuggestion = {
          title: backup.subtitleResult.query.word1,
          url: `https://redfoxsanakirja.fi/fi/sanakirja/-/s/${props.from}/${props.to}/${backup.subtitleResult.query.word1}`,
          detail: undefined,
        };
        setSuggestions([backupSuggestion]);
      }
    } catch (e) {
      console.error("Autocomplete search error:", e);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const historyJson = (await LocalStorage.getItem(`recent-searches-${props.from}-${props.to}`)) as string;
        if (historyJson) {
          try {
            const parsed = JSON.parse(historyJson);
            if (Array.isArray(parsed)) {
              setRecentSearches(parsed);
            }
          } catch (e) {
            console.error("Failed to parse recent searches:", e);
          }
        }
      } catch (e) {
        console.error("Error reading recent searches from LocalStorage:", e);
      }
    })();
  }, []);

  return (
    <List
      isLoading={isLoading}
      throttle
      searchBarPlaceholder={`Search ${props.from === "fin" ? "Finnish" : props.from === "eng" ? "English" : props.from} word...`}
      onSearchTextChange={search}
      isShowingDetail={(suggestions.length > 0 || recentSearches.length > 0) && !isLoading}
    >
      {searchQuery === "" && !isLoading && suggestions.length === 0 && recentSearches.length === 0 ? (
        <List.EmptyView
          icon={Icon.Text}
          title={`Type a ${props.from === "fin" ? "Finnish" : props.from === "eng" ? "English" : props.from} word to define`}
        />
      ) : searchQuery === "" && recentSearches.length > 0 ? (
        <List.Section title={`Recently viewed ${props.from} words`}>
          {recentSearches.map((result, i) => (
            <List.Item
              id={result.title + i}
              key={result.title}
              title={result.title}
              accessories={[{ icon: Icon.Clock }]}
              detail={<List.Item.Detail markdown={result.detail || "No definition available."} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    key="openInBrowser"
                    url={`https://redfoxsanakirja.fi/fi/sanakirja/-/s/${result.from}/${result.to}/${result.title}`}
                  />
                  <Action.CopyToClipboard
                    key="copyToClipboard"
                    content={result.title}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action
                    key="deleteFromRecent"
                    title="Delete from Recent Searches"
                    icon={Icon.Trash}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      const updatedRecent = recentSearches.filter((_, index) => index !== i);
                      setRecentSearches(updatedRecent);
                      await LocalStorage.setItem(
                        `recent-searches-${props.from}-${props.to}`,
                        JSON.stringify(updatedRecent),
                      );
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : searchQuery !== "" && !isLoading && suggestions.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`No ${props.from === "fin" ? "Finnish" : props.from === "eng" ? "English" : props.from} words found matching "${searchQuery}"`}
        />
      ) : (
        <List.Section title={`Definition of ${props.from} words in ${props.to}`}>
          {suggestions.map((result) => (
            <List.Item
              id={result.title}
              key={result.title}
              title={result.title}
              accessories={[{ icon: Icon.MagnifyingGlass }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser key="openInBrowser" url={result.url} />
                  <Action.CopyToClipboard
                    key="copyToClipboard"
                    content={result.title}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel>
              }
              detail={<ResultDetail res={result} from={props.from} to={props.to} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

const ResultDetail = ({ res, from, to }: ResultDetailProps) => {
  const [state, setState] = useState<{ isLoading: boolean; content: string }>({
    isLoading: true,
    content: "",
  });
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const translationRes = await fetch(
          encodeURI(`https://api.redfoxsanakirja.fi/redfox-api/api/basic/query/${from}/${to}/${res.title}`),
          { signal: controller.signal },
        );
        const translation = (await translationRes.json()) as RedFoxAPIResponse;
        const detail = resToDetail(res.title, from, to, translation);

        try {
          const historyJson = (await LocalStorage.getItem(`recent-searches-${from}-${to}`)) as string;
          let recent: RecentSearch[] = [];
          if (historyJson) {
            try {
              const parsed = JSON.parse(historyJson);
              if (Array.isArray(parsed)) {
                recent = parsed;
              }
            } catch (e) {
              console.error("Failed to parse recent searches:", e);
            }
          }
          recent = recent.filter((item: RecentSearch) => item.title !== res.title);
          recent = [
            {
              title: res.title,
              from: from,
              to: to,
              detail: detail,
            },
            ...recent,
          ].slice(0, RECENT_SEARCH_LIMIT);
          await LocalStorage.setItem(`recent-searches-${from}-${to}`, JSON.stringify(recent));
        } catch (e) {
          console.error("Error updating recent searches:", e);
        }

        if (!controller.signal.aborted) {
          setState({ isLoading: false, content: detail });
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Translation fetch error:", err);
        if (!controller.signal.aborted) {
          setState({ isLoading: false, content: "Error fetching definition. Please try again." });
        }
      }
    })();
    return function cleanup() {
      controller.abort();
    };
  }, [res.title, from, to]);
  return <List.Item.Detail isLoading={state.isLoading} markdown={state.content} />;
};
