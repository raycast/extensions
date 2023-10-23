import { useCallback, useMemo, useState } from "react";
import { Preferences, SearchType, Word } from "./types";
import { searchWords } from "./api";
import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";

export default function SearchResults(
  type: SearchType,
  placeholder: string,
  helperTitle?: string,
  helperDescription?: string
) {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState<string>("");

  const onSearch = useCallback((search: string) => {
    setLoading(true);
    searchWords(search, type).then((words) => {
      setWords(words);
      setLoading(false);
      setSearch(search);
    });
  }, []);

  const defaultAction = useMemo(() => {
    return getPreferenceValues<Preferences>().defaultAction || "paste";
  }, []);

  return (
    <List searchBarPlaceholder={placeholder} isLoading={loading} throttle={true} onSearchTextChange={onSearch}>
      {words.length === 0 ? (
        <List.EmptyView
          icon={"command-icon.png"}
          title={helperTitle ?? placeholder}
          description={search !== "" ? "No Results Found" : helperDescription}
        />
      ) : (
        words.map((word) => (
          <List.Item
            icon={"command-icon.png"}
            key={word.word}
            title={word.word}
            subtitle={word.defs !== undefined ? word.defs[0] : ""}
            actions={<Actions {...{ word, search }} defaultAction={defaultAction} />}
          />
        ))
      )}
    </List>
  );
}

function Actions(props: { word: Word; search: string; defaultAction: string }) {
  let content = props.word.word;
  if (props.search[0] === props.search[0].toUpperCase()) content = content[0].toUpperCase() + content.slice(1);

  const pasteAction = <Action.Paste content={content} title="Paste Word in Active App" />;
  const copyAction = <Action.CopyToClipboard content={content} title="Copy Word to Clipboard" />;

  const [firstAction, secondAction] =
    props.defaultAction === "copy" ? [copyAction, pasteAction] : [pasteAction, copyAction];

  return (
    <ActionPanel>
      {firstAction}
      {secondAction}
    </ActionPanel>
  );
}
