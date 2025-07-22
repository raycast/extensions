import { ActionPanel, Action, Icon, List, getSelectedText } from "@raycast/api";
import { ComponentProps, useEffect, useState } from "react";
import { getSpellingSuggestions } from "./spell-check";
import { replaceText } from "./replace-text";

// Test words:  recieve, worlf

type ItemProps = ComponentProps<typeof List.Item>;

export default function Command() {
  const [list, setList] = useState<ItemProps[]>([]);
  const [word, setWord] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      setList([]);
      // Clear the word state to avoid showing stale data
      setWord("");
      try {
        const text = await getSelectedText();
        if (text) {
          setWord((prev) => (prev ? prev : text));
          const items = await getSpellingSuggestions(text);
          const suggestions: ItemProps[] = items.map((suggestion, index) => ({
            id: String(index),
            icon: Icon.Text,
            title: suggestion,
            subtitle: "Suggested spelling",
          }));
          setList(suggestions);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "An error occurred while fetching the selected text");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView title={"Something went wrong"} description={error} />
      </List>
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder={word}>
      <List.Item title={word} />
      <List.EmptyView title="No suggestions found" description="Try selecting a different word or phrase." />
      {list.map((item) => (
        <List.Item
          key={item.id}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action
                title="Replace Text"
                icon={Icon.ThumbsUpFilled}
                onAction={() => replaceText(typeof item.title === "string" ? item.title : item.title.value)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
