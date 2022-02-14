import { useCallback, useState } from "react";
import { SearchType } from "./types";
import { searchGeneralWords } from "./search-api";
import { ActionPanel, Action, List} from "@raycast/api";

export default function SearchResults(type: SearchType) {
  const [words, setWords] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);

  const onSearch = useCallback((search: string) => {
    setLoading(true);
    searchGeneralWords(search, type).then((words) => {
      setWords(words);
      setLoading(false);
    });
  }, []);

  let baseurl: string;
  if (type == SearchType.GENERAL) {
    baseurl = `https://search.naver.com/search.naver?ie=utf8&amp;sm=stp_hty&amp;where=se&amp&query=`;
  } else if (type == SearchType.SHOPPING) {
    baseurl = `https://search.shopping.naver.com/search/all?query=`   
  } else {
    baseurl = ``;
  }
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

function Actions(props: { word: string[], baseurl: string }) {
  console.log(encodeURI(props.baseurl + props.word[0]));
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={encodeURI(props.baseurl + props.word[0])} />
      <Action.CopyToClipboard content={props.word[0]} title={"Copy Word to Clipboard"} />
    </ActionPanel>
  );
}