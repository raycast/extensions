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

  const searchIsCapitalized = useMemo(() => search.length > 0 && search[0] == search[0].toUpperCase(), [search]);

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
        words.map((word) => {
          const wordString = searchIsCapitalized ? word.word[0] + word.word.slice(1) : word.word;
          return (
            <List.Item
              icon={"command-icon.png"}
              key={wordString}
              title={wordString}
              subtitle={word.defs !== undefined ? word.defs[0] : ""}
              actions={<Actions wordString={wordString} defaultAction={defaultAction} />}
            />
          );
        })
      )}
    </List>
  );
}

function Actions(props: { wordString: string; defaultAction: string }) {
  const pasteAction = <Action.Paste content={props.wordString} title="Paste Word in Active App" />;
  const copyAction = <Action.CopyToClipboard content={props.wordString} title="Copy Word to Clipboard" />;

  const [firstAction, secondAction] =
    props.defaultAction === "copy" ? [copyAction, pasteAction] : [pasteAction, copyAction];

  return (
    <ActionPanel>
      {firstAction}
      {secondAction}
    </ActionPanel>
  );
}
