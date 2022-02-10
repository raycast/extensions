import { useCallback, useState } from "react";
import { SearchType, Word } from "./types";
import { searchWords } from "./api";
import { ActionPanel, CopyToClipboardAction, Detail, List, PasteAction } from "@raycast/api";

export default function SearchResults(type: SearchType) {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);

  const onSearch = useCallback((search: string) => {
    setLoading(true);
    searchWords(search, type).then((words) => {
      setWords(words);
      setLoading(false);
    });
  }, []);

  return (
    <List isLoading={loading} throttle={true} onSearchTextChange={onSearch}>
      {words.map((word) => (
        <List.Item
          icon={"command-icon.png"}
          key={word.word}
          title={word.word}
          subtitle={word.defs !== undefined ? word.defs[0] : ""}
          actions={
            <ActionPanel>
              <PasteAction
                content={word.word}
                title="Paste Word"
                shortcut={{
                  modifiers: ["cmd"],
                  key: "return",
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
