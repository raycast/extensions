import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { ActionPanel, Icon, List, LocalStorage, Action } from "@raycast/api";
import { Item } from "./types";
import { EmptyView, CreateItemAction, DeleteItemAction, EditItemAction } from "./components";

type State = {
  isLoading: boolean;
  searchText: string;
  items: Item[];
};

export default function Command() {
  const [state, setState] = useState<State>({
    isLoading: true,
    searchText: "",
    items: [],
  });

  useEffect(() => {
    (async () => {
      const storedItems = await LocalStorage.getItem<string>("items");

      if (!storedItems) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const items: Item[] = JSON.parse(storedItems);
        setState((previous) => ({ ...previous, items, isLoading: false }));
      } catch (e) {
        // can't decode items
        setState((previous) => ({ ...previous, items: [], isLoading: false }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("items", JSON.stringify(state.items));
  }, [state.items]);

  const handleCreate = useCallback(
    (title: string, detail: string) => {
      const newItems = [...state.items, { id: nanoid(), title, detail }];
      setState((previous) => ({ ...previous, items: newItems, searchText: "" }));
    },
    [state.items, setState]
  );

  const handleEdit = useCallback(
    (id: string, title: string, detail: string) => {
      const oldItems = [...state.items];
      const itemIndex = oldItems.findIndex((item) => item.id === id);

      if (itemIndex === -1) {
        throw new Error(`Item with id ${id} not found`);
      }

      oldItems[itemIndex] = { ...oldItems[itemIndex], title, detail };
      setState((previous) => ({ ...previous, items: oldItems }));
    },
    [state.items, setState]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newItems = [...state.items];
      newItems.splice(index, 1);
      setState((previous) => ({ ...previous, items: newItems }));
    },
    [state.items, setState]
  );

  const getItems = useCallback(() => {
    if (!state.searchText) {
      return state.items;
    }
    return state.items.filter(
      (item) =>
        item.title.toLowerCase().includes(state.searchText.toLowerCase()) ||
        item.detail.toLowerCase().includes(state.searchText.toLowerCase())
    );
  }, [state.items, state.searchText]);

  return (
    <List
      isLoading={state.isLoading}
      searchText={state.searchText}
      navigationTitle="Select Saved Items"
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
      isShowingDetail={getItems().length > 0}
    >
      <EmptyView items={getItems()} searchText={state.searchText} onCreate={handleCreate} />
      {getItems().map((items, index) => (
        <List.Item
          key={items.id}
          icon={Icon.SaveDocument}
          title={items.title}
          detail={<List.Item.Detail markdown={items.detail} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Paste
                  title="Paste to Current App"
                  icon={Icon.SaveDocument}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  content={items.detail}
                />
                <Action.CopyToClipboard
                  title="Copy to Clipboard"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  content={items.detail}
                />
                <CreateItemAction onCreate={handleCreate} />
                <EditItemAction itemToEdit={items} onEdit={handleEdit} />
                <DeleteItemAction onDelete={() => handleDelete(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
