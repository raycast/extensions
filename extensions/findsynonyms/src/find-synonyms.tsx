import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

function useSynonyms(word: string) {
  const { data, isLoading, error } = useFetch<
    { word: string; score: number }[]
  >(`https://api.datamuse.com/words?rel_syn=${word}`);
  return {
    synonyms: data?.map((item) => item.word) ?? [],
    scores: data?.map((item) => item.score) ?? [],
    isLoading,
    error,
  };
}

export default function Command() {
  const [search, setSearch] = useState("");
  const { synonyms, scores, isLoading, error } = useSynonyms(search);
  const items = synonyms.slice(0, 9).map((synonym, key) => ({
    id: key,
    title: synonym || "Word",
    subtitle: scores[key] !== undefined ? String(scores[key]) : "Score",
  }));

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Type a word..."
      onSearchTextChange={setSearch}
    >
      {error && <List.EmptyView title="Error" description={String(error)} />}
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.title} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
