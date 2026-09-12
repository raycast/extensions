import {
  ActionPanel,
  Action,
  List,
  Grid,
  Icon,
  confirmAlert,
  Color,
  showToast,
  Toast,
  environment,
  Keyboard,
  getPreferenceValues,
} from "@raycast/api";
import { getItems, saveItems } from "./storage";
import { Item } from "./types";
import { useState, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { SoundForm } from "./soundform";
import { addItem, getLivePlayingPaths, getPlayingPaths, isMacOS, playFile, removeItemEntry, stopFile } from "./utils";

export default function Command() {
  const [connectionsList, setConnectionsList] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [loading, setLoading] = useState<boolean>(true);
  const [playingPaths, setPlayingPaths] = useState<Set<string>>(new Set());
  const preferences = getPreferenceValues<{ layout?: string }>();
  const defaultLayout = preferences.layout ?? "list";
  const [layout, setLayout] = useCachedState("layout", defaultLayout);

  const toggleLayout = () => setLayout((current) => (current === "list" ? "grid" : "list"));

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

  return layout === "grid" ? (
    <Grid
      isLoading={loading}
      columns={5}
      selectedItemId={selectedItemId}
      actions={
        <ActionPanel>
          <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
        </ActionPanel>
      }
    >
      <Grid.EmptyView
        title={connectionsList.length === 0 ? "No Sounds Found" : "No Results"}
        description={
          connectionsList.length === 0 ? `Press ${isMacOS ? "⌘+N" : "Ctrl+N"} to add a file` : "Try a different search"
        }
        icon={{ source: "no-view.png" }}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add New Sound"
              shortcut={Keyboard.Shortcut.Common.New}
              icon={Icon.PlusCircle}
              target={
                <SoundForm
                  onEdit={async function (item: Item): Promise<void> {
                    await handleCreate(item);
                  }}
                />
              }
            />
            <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
          </ActionPanel>
        }
      />
      {connectionsList.map((item) => (
        <Grid.Item
          key={item.id}
          id={item.id}
          content={{ source: getItemIcon(item), tooltip: item.title }}
          title={item.title}
          subtitle={item.path.toString()}
          accessory={getGridAccessory(item, playingPaths.has(item.path[0]))}
          actions={
            <Actions
              item={item}
              items={connectionsList}
              isPlaying={playingPaths.has(item.path[0])}
              layout={layout}
              refreshPlaying={refreshPlaying}
              refreshPlayingFromRegistry={refreshPlayingFromRegistry}
              onToggleLayout={toggleLayout}
              onEdit={handleCreate}
              onItemRemove={removeItem}
              saveItemEntries={saveItemEntries}
            />
          }
        />
      ))}
    </Grid>
  ) : (
    <List isLoading={loading} selectedItemId={selectedItemId}>
      <List.EmptyView
        title={connectionsList.length === 0 ? "No Sounds Found" : "No Results"}
        description={
          connectionsList.length === 0 ? `Press ${isMacOS ? "⌘+N" : "Ctrl+N"} to add a file` : "Try a different search"
        }
        icon={{ source: "no-view.png" }}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add New Sound"
              shortcut={Keyboard.Shortcut.Common.New}
              icon={Icon.PlusCircle}
              target={
                <SoundForm
                  onEdit={async function (item: Item): Promise<void> {
                    await handleCreate(item);
                  }}
                />
              }
            />
            <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
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
          accessories={getListAccessories(item, playingPaths.has(item.path[0]))}
          actions={
            <Actions
              item={item}
              items={connectionsList}
              isPlaying={playingPaths.has(item.path[0])}
              layout={layout}
              refreshPlaying={refreshPlaying}
              refreshPlayingFromRegistry={refreshPlayingFromRegistry}
              onToggleLayout={toggleLayout}
              onEdit={handleCreate}
              onItemRemove={removeItem}
              saveItemEntries={saveItemEntries}
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

function getListAccessories(item: Item, isPlaying: boolean) {
  const accessories: List.Item.Accessory[] = [];
  if (isPlaying) {
    accessories.push({ icon: Icon.SpeakerOn, tooltip: "Playing" });
  }
  const favoriteNumber = parseInt(item.favourite);
  if (favoriteNumber > 0) {
    accessories.push({ text: `Favourite #${favoriteNumber}`, icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }
  return accessories;
}

function getGridAccessory(item: Item, isPlaying: boolean) {
  if (isPlaying) {
    return { icon: Icon.SpeakerOn, tooltip: "Playing" };
  }
  const favoriteNumber = parseInt(item.favourite);
  if (favoriteNumber > 0) {
    return { icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: `Favourite #${favoriteNumber}` };
  }
  return undefined;
}

function ToggleLayoutAction({ layout, onToggleLayout }: { layout: string; onToggleLayout: () => void }) {
  return (
    <Action
      title="Toggle Layout"
      icon={layout === "list" ? Icon.AppWindowGrid3x3 : Icon.AppWindowList}
      shortcut={{ macOS: { modifiers: ["cmd"], key: "l" }, Windows: { modifiers: ["ctrl"], key: "l" } }}
      onAction={onToggleLayout}
    />
  );
}

function Actions({
  item,
  items,
  isPlaying,
  layout,
  refreshPlaying,
  refreshPlayingFromRegistry,
  onToggleLayout,
  onEdit,
  saveItemEntries,
  onItemRemove,
}: {
  item: Item;
  items: Item[];
  isPlaying: boolean;
  layout: string;
  refreshPlaying: () => void;
  refreshPlayingFromRegistry: () => void;
  onToggleLayout: () => void;
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
        icon={Icon.PlusCircle}
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
        <ToggleLayoutAction layout={layout} onToggleLayout={onToggleLayout} />
        <Action
          title="Refresh"
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
