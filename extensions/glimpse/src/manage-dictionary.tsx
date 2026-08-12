import { Action, ActionPanel, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { glimpse } from "./glimpse";

export default function Command() {
  const [search, setSearch] = useState("");
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const res = await glimpse<{ words: string[] }>(["dictionary", "list"]);
    return res.words;
  });

  const words = data ?? [];
  const query = search.trim();
  const filtered = query ? words.filter((word) => word.toLowerCase().includes(query.toLowerCase())) : words;
  const exists = words.some((word) => word.toLowerCase() === query.toLowerCase());

  async function mutate(verb: "add" | "remove", word: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: verb === "add" ? `Adding "${word}"…` : `Removing "${word}"…`,
    });
    try {
      await glimpse(["dictionary", verb, word]);
      toast.style = Toast.Style.Success;
      toast.title = verb === "add" ? `Added "${word}"` : `Removed "${word}"`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Glimpse";
      toast.message = (error as Error).message;
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search or add a word"
    >
      {query && !exists ? (
        <List.Item
          title={`Add “${query}”`}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title="Add Word" icon={Icon.Plus} onAction={() => mutate("add", query)} />
            </ActionPanel>
          }
        />
      ) : null}
      {filtered.map((word) => (
        <List.Item
          key={word}
          title={word}
          icon={Icon.Text}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={word} />
              <Action
                title="Delete Word"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (await confirmAlert({ title: `Delete “${word}”?`, primaryAction: { title: "Delete" } })) {
                    await mutate("remove", word);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No words" description="Type a word to add it." />
    </List>
  );
}
