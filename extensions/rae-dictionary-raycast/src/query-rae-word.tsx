import { useState } from "react";
import { List, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ApiError, searchWord, WordEntry } from "./api/rae";
import { WordEntryFC } from "./components/WordEntry";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<WordEntry | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (text: string) => {
    if (!text.trim()) {
      setSuggestions([]);
      setResults(null);
      setError(null);
      return;
    }

    setSuggestions([]);
    setIsLoading(true);
    setError(null);

    try {
      const entry = await searchWord(text.trim());
      setResults(entry);
    } catch (e: ApiError | unknown) {
      if (e instanceof ApiError && e.suggestions.length > 0) {
        setSuggestions(e.suggestions);
      } else {
        setError(String(e));
        showFailureToast(e, { title: "Could not load requested word" });
      }
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
      ) : suggestions.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Search for a word" description="Type to search..." />
      ) : (
        <List.Section title="Suggestions">
          {suggestions.map((suggestion) => (
            <WordEntryFC key={suggestion} wordEntry={{ word: suggestion, meanings: [], suggestions: [] }} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
