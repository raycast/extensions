import { useEffect, useState } from "react";
import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getRandomWord, WordEntry } from "./api/rae";
import { WordEntryFC } from "./components/WordEntry";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [wordEntry, setWordEntry] = useState<WordEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRandomWord = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const entry = await getRandomWord();
      setWordEntry(entry);
    } catch (e) {
      setError(String(e));
      showFailureToast(e, { title: "Could not load random word" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomWord();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Random word from RAE dictionary"
      searchBarPlaceholder="Loading random word..."
      actions={
        <ActionPanel>
          <Action
            title="Load Another Random Word"
            onAction={fetchRandomWord}
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load a random word"
          description={`${error}. Try again.`}
          actions={
            <ActionPanel>
              <Action title="Try Again" onAction={fetchRandomWord} icon={Icon.Repeat} />
            </ActionPanel>
          }
        />
      ) : wordEntry ? (
        <WordEntryFC wordEntry={wordEntry} />
      ) : (
        <List.EmptyView title="Loading..." />
      )}
    </List>
  );
}
