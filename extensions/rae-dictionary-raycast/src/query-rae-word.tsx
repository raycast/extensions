import { useState } from "react";
import { List, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { searchWord, WordEntry } from "./api/rae";
import { WordEntryFC } from "./components/WordEntry";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<WordEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (text: string) => {
    if (!text.trim()) {
      setResults(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const entry = await searchWord(text.trim());
      setResults(entry);
    } catch (e) {
      setError(String(e));
      showFailureToast(e, { title: "Error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text) => {
        handleSearch(text);
      }}
      searchBarPlaceholder="Search in RAE dictionary..."
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Word not found"
          description="Try with another word or check your spelling."
        />
      ) : results ? (
        <WordEntryFC wordEntry={results} />
      ) : null}
    </List>
  );
}
