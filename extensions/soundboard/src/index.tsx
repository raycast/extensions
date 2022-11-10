import { ActionPanel, Action, List, Icon, confirmAlert, Color, useNavigation } from "@raycast/api";
import { getItems } from "./storage";
import { Item } from "./types";
import { useState, useEffect } from "react";
import { SoundForm } from "./soundform";
import { addItem, playFile, removeItemEntry } from "./utils";

export default function Command() {
  const [connectionsList, setConnectionsList] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { pop } = useNavigation();

  useEffect(() => {
    (async () => {
      setConnectionsList(await getItems());
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

  return (
    <List isLoading={loading}>
      <List.EmptyView
        title="No Sounds Found"
        description="Press ⌘+N to add a file"
        //icon={Icon.NewDocument}
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
                    pop();
                  }}
                />
              }
            />
          </ActionPanel>
        }
      />
      {connectionsList.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.Music}
          title={item.title}
          subtitle={item.path.toString()}
          accessories={getAccessories(item)}
          actions={<Actions item={item} onEdit={handleCreate} onItemRemove={removeItem} />}
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
  onEdit,
  onItemRemove,
}: {
  item: Item;
  onEdit: (item: Item) => Promise<void>;
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
        target={<SoundForm onEdit={onEdit} />}
      />
      <Action.Push
        title="Edit Sound"
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        icon={Icon.Pencil}
        target={<SoundForm item={item} onEdit={onEdit} />}
      />
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
