import { Action, ActionPanel, Icon, List } from "@raycast/api";
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  async function search(query: string) {
    setSearchQuery(query);
    if (!query) return;
    setIsLoading(true);
    const res = await axios.get(
      encodeURI(`https://api.redfoxsanakirja.fi/redfox-api/api/basic/autocomplete/${props.from}/${query}`)
    );
    const sugg = res.data.map((item: string) => ({
      title: item,
      url: `https://redfoxsanakirja.fi/fi/sanakirja/-/s/${props.from}/${props.to}/${item}`,
      detail: null,
    }));
    setSuggestions(sugg);
    setIsLoading(false);
  }

  return (
    <List
      isLoading={isLoading}
      throttle
      searchBarPlaceholder="Search..."
      onSearchTextChange={search}
      isShowingDetail={suggestions.length > 0}
      navigationTitle={`Define ${props.from} word in ${props.to}`}
    >
      {(searchQuery === "" || isLoading) && suggestions.length === 0 ? (
        <List.EmptyView icon={Icon.Text} title="Type a word to define" />
      ) : (
        suggestions.map((result) => (
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
        ))
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
          setState({ isLoading: false, content: resToDetail(res.title, from, to, translation.data) });
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
