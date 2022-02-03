import { useCallback, useState } from "react";
import { SearchType, Word } from "./types";
import { searchWords } from "./api";
import { Detail, List } from "@raycast/api";

export default function SearchResults(type: SearchType) {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState<string>();

  const onSearch = useCallback((search: string) => {
    setLoading(true);
    searchWords(search, type).then((words) => {
      setWords(words);
      console.log("count", words.length);
      setLoading(false);
    });
  }, []);

  // {/*<List throttle={true} onSearchTextChange={onSearch}>*/}
  // {/*  <List.Item key={2} title={"sdf"} />*/}
  // {/*</List>*/}
  return (
    <List isLoading={loading} throttle={true} onSearchTextChange={onSearch}>
      {/*<List isLoading={loading} throttle={true} onSearchTextChange={onSearch}>*/}
      {words.map((word) => (
        <List.Item key={word.word} title={word.word} subtitle={word.defs[0]} />
      ))}
    </List>
  );
}
