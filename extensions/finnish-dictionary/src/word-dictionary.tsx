import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { resToDetail } from "./common";

interface Suggestion {
  title: string;
  url: string;
  detail?: string;
}

export default function WordDictionary(props: { from: string; to: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  async function search(query: string) {
    setSearchQuery(query);
    if (!query) return;
    setIsLoading(true);
    const res = await axios.get(
      encodeURI(`https://api.redfoxsanakirja.fi/redfox-api/api/basic/autocomplete/${props.from}/${query}`)
    );
    if (res.data.length > 0) {
      const sugg = res.data.map((item: string) => ({
        title: item,
        url: `https://redfoxsanakirja.fi/fi/sanakirja/-/s/${props.from}/${props.to}/${item}`,
        detail: null,
      }));
      setSuggestions(sugg);
    } else {
      const backup = await axios.get(
        encodeURI(`https://api.redfoxsanakirja.fi/redfox-api/api/basic/query/${props.from}/${props.to}/${query}`)
      );
      if (!backup.data.subtitleResult.query.word2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }
      setSuggestions([
        {
          title: backup.data.subtitleResult.query.word1,
          url: `https://redfoxsanakirja.fi/fi/sanakirja/-/s/${props.from}/${props.to}/${backup.data.subtitleResult.query.word1}`,
          detail: undefined,
        },
      ]);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    (async () => {
      const historyJson = (await LocalStorage.getItem(`recent-searches-${props.from}-${props.to}`)) as string;
      if (historyJson) {
        setRecentSearches(JSON.parse(historyJson));
      }
    })();
  }, []);

  return (
    <List
      isLoading={isLoading}
      throttle
      searchBarPlaceholder="Search..."
      onSearchTextChange={search}
      isShowingDetail={(suggestions.length > 0 || recentSearches.length > 0) && !isLoading}
    >
      {(searchQuery === "" || isLoading) && suggestions.length === 0 && recentSearches.length == 0 ? (
        <List.EmptyView icon={Icon.Text} title={`Type a ${props.from} word to define`} />
      ) : searchQuery === "" && recentSearches.length > 0 ? (
        <List.Section title={`Recently viewed ${props.from} words`}>
          {recentSearches.map((result, i) => (
            <List.Item
              id={result.title + i}
              key={result.title}
              title={result.title}
              accessories={[{ icon: Icon.Clock }]}
              detail={<List.Item.Detail markdown={result.detail} />}
            />
          ))}
        </List.Section>
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
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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

interface ResultDetailProps {
  res: any;
  from: string;
  to: string;
}

const ResultDetail = ({ res, from, to }: ResultDetailProps) => {
  const [state, setState] = useState<{ isLoading: boolean; content: string }>({
    isLoading: true,
    content: "",
  });
  const isMounted = useRef(true);
  useEffect(() => {
    (async () => {
      try {
        const translation = await axios.get(
          encodeURI(`https://api.redfoxsanakirja.fi/redfox-api/api/basic/query/${from}/${to}/${res.title}`)
        );
        if (isMounted.current) {
          const detail = resToDetail(res.title, from, to, translation.data);
          const historyJson = (await LocalStorage.getItem(`recent-searches-${from}-${to}`)) as string;
          let recent = historyJson ? JSON.parse(historyJson) : [];
          recent = recent.filter((item: any) => item.title !== res.title);
          recent = [
            {
              title: res.title,
              from: from,
              to: to,
              detail: detail,
            },
            ...recent,
          ].splice(0, 10);
          await LocalStorage.setItem(`recent-searches-${from}-${to}`, JSON.stringify(recent));

          setState({ isLoading: false, content: detail });
        }
      } catch (_e) {
        if (isMounted.current) {
          setState({ isLoading: false, content: "Error fetching definition. Please try again." });
        }
      }
    })();
    return function cleanup() {
      isMounted.current = false;
    };
  }, []);
  return <List.Item.Detail isLoading={state.isLoading} markdown={state.content} />;
};
