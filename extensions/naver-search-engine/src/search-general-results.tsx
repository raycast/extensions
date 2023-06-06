import { useCallback, useState } from "react";
import { SearchType } from "./types";
import { searchGeneralWords } from "./search-general-api";
import { ActionPanel, Action, List } from "@raycast/api";

export default function SearchResults(type: string) {
  const [words, setWords] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);

  const onSearch = useCallback((search: string) => {
    setLoading(true);
    searchGeneralWords(search, type).then((words) => {
      setWords(words);
      setLoading(false);
    });
  }, []);

  const baseurl = SearchType[type].baseURL;

  return (
    <List isLoading={loading} throttle={true} onSearchTextChange={onSearch}>
      {words.map((word) => (
        <List.Item
          icon={"command-icon.png"}
          key={word[0]}
          title={word[0]}
          actions={<Actions word={word} baseurl={baseurl} />}
        />
      ))}
    </List>
  );
}

function Actions(props: { word: string[]; baseurl: string }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={encodeURI(props.baseurl + props.word[0])} />
      <Action.CopyToClipboard content={props.word[0]} title={"Copy Word to Clipboard"} />
    </ActionPanel>
  );
}
