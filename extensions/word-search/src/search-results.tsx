import { useCallback, useState } from "react";
import { SearchType, Word } from "./types";
import { searchWords } from "./api";
import { Action, ActionPanel, List } from "@raycast/api";

export default function SearchResults(type: SearchType, placeholder: string) {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchString, setSearchString] = useState("");

  const onSearch = useCallback((search: string) => {
    setLoading(true);
    searchWords(search, type).then((words) => {
      setWords(words);
      setSearchString(search);
      setLoading(false);
    });
  }, []);

  return (
    <List searchBarPlaceholder={placeholder} isLoading={loading} throttle={true} onSearchTextChange={onSearch}>
      {words.map((word) => (
        <List.Item
          icon={"command-icon.png"}
          key={word.word}
          title={word.word}
          subtitle={word.defs !== undefined ? word.defs[0] : ""}
          actions={<Actions word={word} />}
        />
      ))}
    </List>
  );
}

function Actions(props: { word: Word }) {
  return (
    <ActionPanel>
      <Action.Paste content={props.word.word} title="Paste Word in Active App" />
      <Action.CopyToClipboard content={props.word.word} title={"Copy Word to Clipboard"} />
    </ActionPanel>
  );
}
