import { getSelectedText, Icon, List } from "@raycast/api";
import { ComponentProps, useEffect, useState } from "react";
import { getSpellingSuggestions } from "./spell-check";

type ItemProps = ComponentProps<typeof List.Item>;

export const useFixSpelling = () => {
  const [list, setList] = useState<ItemProps[]>([]);
  const [word, setWord] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (word) return;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      setList([]);
      setWord("");

      try {
        const text = await getSelectedText();
        if (!text.trim()) {
          setWord("No text selected");
          setList([]);
          setIsLoading(false);
          return;
        }

        setWord(text);
        const items = await getSpellingSuggestions(text);
        const suggestions: ItemProps[] = items.map((suggestion, index) => ({
          id: String(index),
          icon: Icon.Text,
          title: suggestion,
          subtitle: "Suggested spelling",
        }));
        setList(suggestions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error(errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, []);

  return { list, word, error, isLoading, resetWord: () => setWord("") };
};
