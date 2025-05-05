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
      searchBarPlaceholder="Buscar en el diccionario RAE..."
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Palabra no encontrada"
          description="Intenta con otra palabra o revisa tu ortografía."
        />
      ) : results ? (
        <WordEntryFC wordEntry={results} />
      ) : null}
    </List>
  );
}
