import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { LANGUAGES, STORE, STR } from "./constants";
import { useWordStorage } from "./hooks/use-word-storage";
import { copy, print } from "./utils";

export default function Favorites() {
  const { words, removeWord, isLoading } = useWordStorage(STORE.FAVORITES);
  const [searchResults, setSearchResults] = useState<WordEntry[]>(words);

  useEffect(() => {
    setSearchResults(words);
  }, [words]);

  const onSearch = (term: string) => {
    if (!term) {
      setSearchResults(words);
      return;
    }
    const filteredWords = words.filter(
      (wordEntry) =>
        wordEntry.word.toLowerCase().includes(term.toLowerCase()) ||
        wordEntry.translation.toLowerCase().includes(term.toLowerCase()),
    );
    setSearchResults(filteredWords);
  };

  return (
    <List onSearchTextChange={onSearch} isLoading={isLoading}>
      {!searchResults || searchResults.length === 0 ? (
        <List.EmptyView title={STR.NO_FAVORITE_WORDS} description={STR.FAVORITE_DESCRIPTION} />
      ) : (
        searchResults.map((wordEntry) => (
          <List.Item
            key={wordEntry.word}
            title={print(wordEntry)}
            accessories={[
              {
                tag: {
                  value: `${LANGUAGES[wordEntry.wordLanguageCode].title} →  ${LANGUAGES[wordEntry.translationLanguageCode].title}`,
                  color: Color.Green,
                },
                tooltip: `Added: ${new Date(wordEntry.timestamp).toLocaleString()}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.StarDisabled}
                  title={STR.REMOVE_FROM_FAVORITES}
                  onAction={() => removeWord(wordEntry.word)}
                />
                <Action icon={Icon.CopyClipboard} title={STR.COPY} onAction={() => copy(wordEntry)} />
                <Action icon={Icon.CopyClipboard} title={STR.COPY_ALL} onAction={() => copy(searchResults)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
