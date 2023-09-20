import { Action, ActionPanel, Icon, List, clearSearchBar } from "@raycast/api";
import fs from "fs";
import { useEffect, useState } from "react";
import { LIST_HISTORY, getInitialValue } from "./fileWrite";

// Durstenfeld shuffle
// https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
function shuffle(arr: Array<string>) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

export default function Command() {
  const [items, setItems] = useState<Array<string>>(getInitialValue()?.split(",") ?? []);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    if (items.length > 0) {
      fs.writeFileSync(LIST_HISTORY, items.join(","));
    }
  }, [items]);

  const addItem = async () => {
    if (newItem === "") return;
    setItems([...items, newItem]);
    await clearSearchBar();
  };

  const randomize = () => {
    const toRandomize = [...items];
    setItems(shuffle(toRandomize));
  };

  return (
    <List
      searchBarPlaceholder="Add items to the list"
      onSearchTextChange={(text: string) => setNewItem(text)}
      searchText={newItem}
      actions={
        <ActionPanel>
          <Action title="Add" onAction={() => addItem()} />
        </ActionPanel>
      }
    >
      {items.map((item, idx) => (
        <List.Item
          key={idx}
          title={item}
          actions={
            <ActionPanel>
              <Action title="Add" icon={Icon.Plus} onAction={() => addItem()} />
              <Action
                title="Randomize"
                icon={Icon.Wand}
                onAction={() => randomize()}
                shortcut={{ modifiers: ["cmd"], key: "j" }}
              />
              <Action.CopyToClipboard
                title="Copy List"
                content={items.join(", ")}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
              <Action.Trash
                onTrash={() => setItems([])}
                paths={LIST_HISTORY}
                title="Clear List"
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
