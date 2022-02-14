import { useCallback, useState } from "react";
import { SearchType } from "./types";
import { searchWords } from "./dict-api";
import { ActionPanel, Action, List } from "@raycast/api";

export default function SearchResults(type: SearchType) {
  const [words, setWords] = useState<string[][][]>([]);
  const [loading, setLoading] = useState(false);

  const onSearch = useCallback((search: string) => {
    setLoading(true);
    searchWords(search, type).then((words) => {
      setWords(words);
      setLoading(false);
    });
  }, []);

  let baseurl: string;
  if (type == SearchType.ENEN) {
    baseurl = `http://endic.naver.com/search.nhn?ie=utf8&query=`;
  } else if (type == SearchType.KOKO) {
    baseurl = `http://krdic.naver.com/search.nhn?kind=all&query=`;
  } else {
    baseurl = ``;
  }

  return (
    <List isLoading={loading} throttle={true} onSearchTextChange={onSearch}>
      {words.map((word) => (
        <List.Item
          icon={"command-icon.png"}
          key={word[0][0]}
          title={word[0][0]}
          subtitle={word[1][0]}
          actions={<Actions word={word} baseurl={baseurl} />}
        />
      ))}
    </List>
  );
}

function Actions(props: { word: string[][]; baseurl: string }) {
  console.log(encodeURI(props.baseurl + props.word[0][0]));
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={encodeURI(props.baseurl + props.word[0][0])} />
      <Action.CopyToClipboard content={props.word[0][0]} title={"Copy Word to Clipboard"} />
    </ActionPanel>
  );
}
