import {
  ActionPanel,
  Action,
  List,
  Icon,
  confirmAlert,
  Color,
  showToast,
  Toast,
  environment,
  Keyboard,
} from "@raycast/api";
import { getItems, saveItems } from "./storage";
import { Item } from "./types";
import { useState, useEffect } from "react";
import { SoundForm } from "./soundform";
import { addItem, getLivePlayingPaths, getPlayingPaths, playFile, removeItemEntry, stopFile } from "./utils";

export default function Command() {
  const [connectionsList, setConnectionsList] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [loading, setLoading] = useState<boolean>(true);
  const [playingPaths, setPlayingPaths] = useState<Set<string>>(new Set());

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

  const setPlayingPathsFrom = (paths: string[]) => {
    setPlayingPaths((prev) => {
      const next = new Set(paths);
      if (prev.size !== next.size || [...prev].some((path) => !next.has(path))) {
        return next;
      }
      return prev;
    });
  };

  const refreshPlayingFromRegistry = () => {
    setPlayingPathsFrom(getPlayingPaths());
  };

  const refreshPlaying = async () => {
    setPlayingPathsFrom(await getLivePlayingPaths());
  };

  useEffect(() => {
    refreshPlaying();
    const timer = setInterval(refreshPlaying, 1000);
    return () => clearInterval(timer);
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
              shortcut={Keyboard.Shortcut.Common.New}
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
          icon={getItemIcon(item)}
          title={item.title}
          subtitle={item.path.toString()}
          accessories={getAccessories(item)}
          actions={
            <Actions
              item={item}
              items={connectionsList}
              isPlaying={playingPaths.has(item.path[0])}
              refreshPlaying={refreshPlaying}
              refreshPlayingFromRegistry={refreshPlayingFromRegistry}
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

function getItemIcon(item: Item) {
  return item.icon ? (Icon[item.icon as keyof typeof Icon] ?? Icon.Music) : Icon.Music;
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
  isPlaying,
  refreshPlaying,
  refreshPlayingFromRegistry,
  onEdit,
  saveItemEntries,
  onItemRemove,
}: {
  item: Item;
  items: Item[];
  isPlaying: boolean;
  refreshPlaying: () => void;
  refreshPlayingFromRegistry: () => void;
  onEdit: (item: Item) => Promise<void>;
  saveItemEntries: (items: Item[], item: Item) => Promise<void>;
  onItemRemove: (item: Item) => Promise<void>;
}) {
  return (
    <ActionPanel>
      <Action
        title={`${isPlaying ? "Stop" : "Play"} ${item.title}`}
        icon={isPlaying ? Icon.Stop : "command-icon.png"}
        onAction={() => {
          if (isPlaying) {
            stopFile(item);
          } else {
            playFile(item);
          }
          refreshPlayingFromRegistry();
        }}
      />
      <Action.Push
        title="Add New Sound"
        shortcut={Keyboard.Shortcut.Common.New}
        icon={Icon.Document}
        target={<SoundForm onEdit={onEdit} items={items} />}
      />
      <Action.Push
        title="Edit Sound"
        shortcut={Keyboard.Shortcut.Common.Edit}
        icon={Icon.Pencil}
        target={<SoundForm item={item} onEdit={onEdit} items={items} />}
      />

      <ActionPanel.Section>
        <Action
          // eslint-disable-next-line @raycast/prefer-title-case
          title="Move Up"
          shortcut={Keyboard.Shortcut.Common.MoveUp}
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
          shortcut={Keyboard.Shortcut.Common.MoveDown}
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
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={async () => {
          if (await confirmAlert({ title: `Are you sure you want to delete "${item.title}"?` })) {
            await onItemRemove(item);
          }
        }}
      />

      <ActionPanel.Section>
        <Action
          title="Refresh Playing State"
          shortcut={Keyboard.Shortcut.Common.Refresh}
          icon={Icon.ArrowClockwise}
          onAction={() => {
            refreshPlaying();
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
