import { ActionPanel, Action, List, Icon, confirmAlert, Color, showToast, Toast, environment } from "@raycast/api";
import { getItems, saveItems } from "./storage";
import { Item } from "./types";
import { useState, useEffect } from "react";
import { SoundForm } from "./soundform";
import { addItem, playFile, removeItemEntry } from "./utils";

export default function Command() {
  const [connectionsList, setConnectionsList] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const items = await getItems();
      setConnectionsList(items);

      if (environment.launchContext && items.length === 0) {
        showToast(Toast.Style.Failure, "No sounds found", "Create a sound to get started");
      }

      setLoading(false);
    })();
  }, []);

  async function removeItem(item: Item) {
    const items = await removeItemEntry(item);
    setConnectionsList(items);
  }

  async function handleCreate(item: Item) {
    const items = await addItem(item);
    setConnectionsList(items);
  }

  async function saveItemEntries(items: Item[], item: Item) {
    await saveItems(items);
    await setConnectionsList(items);
    setSelectedItemId(item.id);
  }

  return (
    <List isLoading={loading} selectedItemId={selectedItemId}>
      <List.EmptyView
        title={connectionsList.length === 0 ? "No Sounds Found" : "No Results"}
        description={connectionsList.length === 0 ? "Press ⌘+N to add a file" : "Try a different search"}
        icon={{ source: "no-view.png" }}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add New Sound"
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              icon={Icon.Document}
              target={
                <SoundForm
                  onEdit={async function (item: Item): Promise<void> {
                    await handleCreate(item);
                  }}
                />
              }
            />
          </ActionPanel>
        }
      />
      {connectionsList.map((item) => (
        <List.Item
          id={item.id}
          key={item.id}
          icon={Icon.Music}
          title={item.title}
          subtitle={item.path.toString()}
          accessories={getAccessories(item)}
          actions={
            <Actions
              item={item}
              items={connectionsList}
              saveItemEntries={saveItemEntries}
              onEdit={handleCreate}
              onItemRemove={removeItem}
            />
          }
        />
      ))}
    </List>
  );
}

function getAccessories(item: Item) {
  const favoriteNumber = parseInt(item.favourite);
  if (favoriteNumber > 0) {
    return [{ text: `Favourite #${favoriteNumber}`, icon: { source: Icon.Star, tintColor: Color.Yellow } }];
  }

  return [];
}

function Actions({
  item,
  items,
  onEdit,
  saveItemEntries,
  onItemRemove,
}: {
  item: Item;
  items: Item[];
  onEdit: (item: Item) => Promise<void>;
  saveItemEntries: (items: Item[], item: Item) => Promise<void>;
  onItemRemove: (item: Item) => Promise<void>;
}) {
  return (
    <ActionPanel>
      <Action
        title={`Play ${item.title}`}
        icon="command-icon.png"
        onAction={() => {
          playFile(item);
        }}
      />
      <Action.Push
        title="Add New Sound"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={Icon.Document}
        target={<SoundForm onEdit={onEdit} items={items} />}
      />
      <Action.Push
        title="Edit Sound"
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        icon={Icon.Pencil}
        target={<SoundForm item={item} onEdit={onEdit} items={items} />}
      />

      <ActionPanel.Section>
        <Action
          title="Move Up"
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          icon={Icon.ChevronUp}
          onAction={async () => {
            const index = items.findIndex((i) => i.id === item.id);
            if (index > 0) {
              const newItems = [...items];

              newItems[index] = newItems[index - 1];
              newItems[index - 1] = item;

              await saveItemEntries(newItems, item);
            }
          }}
        />
        <Action
          title="Move Down"
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          icon={Icon.ChevronDown}
          onAction={async () => {
            const index = items.findIndex((i) => i.id === item.id);
            if (index < items.length - 1) {
              const newItems = [...items];
              newItems[index] = newItems[index + 1];
              newItems[index + 1] = item;

              await saveItemEntries(newItems, item);
            }
          }}
        />
      </ActionPanel.Section>

      <Action
        title="Remove Sound"
        style={Action.Style.Destructive}
        icon={Icon.Trash}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={async () => {
          if (await confirmAlert({ title: `Are you sure you want to delete "${item.title}"?` })) {
            await onItemRemove(item);
          }
        }}
      />
    </ActionPanel>
  );
}
