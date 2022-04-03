import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
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

  let currentQuery = "";

  async function search(query: string) {
    if (!query) return;
    setIsLoading(true);
    currentQuery = query;
    const res = await axios.get(
      encodeURI(`https://api.redfoxsanakirja.fi/redfox-api/api/basic/autocomplete/${props.from}/${query}`)
    );
    const sugg = res.data.map((item: string) => ({
      title: item,
      url: `https://redfoxsanakirja.fi/fi/sanakirja/-/s/${props.from}/${props.to}/${item}`,
      detail: null,
    }));
    for (let i = 0; i < sugg.length; i++) {
      const tran = await axios.get(
        encodeURI(
          `https://api.redfoxsanakirja.fi/redfox-api/api/basic/query/${props.from}/${props.to}/${sugg[i].title}`
        )
      );
      sugg[i].detail = resToDetail(sugg[i].title, props.from, props.to, tran.data);
      if (currentQuery !== query) return;
      setSuggestions(sugg);
    }
    setSuggestions(sugg);
    setIsLoading(false);
  }

  return (
    <List
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search perkle..."
      onSearchTextChange={search}
      isShowingDetail={suggestions.length > 0}
      navigationTitle={`Define ${props.from} word in ${props.to}`}
    >
      {suggestions.map((x, index) => (
        <List.Item
          key={x.title}
          title={x.title}
          accessories={x.detail ? [{ icon: Icon.MagnifyingGlass }] : []}
          id={index.toString()}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser key="openInBrowser" url={x.url} />
              <Action.CopyToClipboard
                key="copyToClipboard"
                content={x.title}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={x.detail} />}
        />
      ))}
    </List>
  );
}
