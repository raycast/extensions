import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { addPersonalWord, getPersonalWords, removePersonalWord } from "./lib/storage";

export default function Command() {
  const [words, setWords] = useState<string[]>();
  const [search, setSearch] = useState("");

  const reload = () => getPersonalWords().then(setWords);
  useEffect(() => {
    reload();
  }, []);

  const candidate = search.trim();
  const canAdd = !!candidate && !/\s/.test(candidate) && !words?.includes(candidate);

  async function add() {
    await addPersonalWord(candidate);
    setSearch("");
    await reload();
    await showToast({ style: Toast.Style.Success, title: `Added “${candidate}”` });
  }

  return (
    <List
      isLoading={!words}
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search or type a word to add"
      filtering
    >
      {canAdd ? (
        <List.Section title="Add">
          <List.Item
            title={`Add “${candidate}”`}
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action title="Add to Dictionary" icon={Icon.Plus} onAction={add} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      <List.EmptyView
        icon={Icon.Book}
        title="Your dictionary is empty"
        description="Type a word to add it. Names, brands and slang you add are never converted or marked as misspelled."
      />
      <List.Section title="Words" subtitle={words?.length ? String(words.length) : undefined}>
        {words?.map((word) => (
          <List.Item
            key={word}
            title={word}
            icon={Icon.Text}
            actions={
              <ActionPanel>
                {canAdd ? <Action title={`Add “${candidate}”`} icon={Icon.Plus} onAction={add} /> : null}
                <Action
                  title="Remove from Dictionary"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    await removePersonalWord(word);
                    await reload();
                  }}
                />
                <Action.CopyToClipboard content={word} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
