import { List, Action, ActionPanel, Icon, showToast, Toast, LocalStorage, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";

interface SavedGrid {
  id: string;
  name: string;
  description?: string;
  sites: string[];
  layout: string;
  createdAt: string;
}

// Sample data until GridView Pro has export/saved grids API
const sampleGrids: SavedGrid[] = [
  {
    id: "1",
    name: "My Crypto Setup",
    description: "Daily trading dashboard",
    sites: ["dexscreener.com", "twitter.com", "coingecko.com", "telegram.org"],
    layout: "2x2",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Morning News",
    description: "HN, Reddit, Tech news",
    sites: ["news.ycombinator.com", "reddit.com", "techcrunch.com", "theverge.com"],
    layout: "1x4",
    createdAt: "2024-01-10",
  },
  {
    id: "3",
    name: "Dev Workspace",
    description: "GitHub, Docs, Stack Overflow",
    sites: ["github.com", "stackoverflow.com", "developer.mozilla.org", "vercel.com"],
    layout: "2x2",
    createdAt: "2024-01-08",
  },
];

export default function Command() {
  const [grids, setGrids] = useState<SavedGrid[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGrids();
  }, []);

  async function loadGrids() {
    try {
      // Try to load from local storage (cached grids)
      const stored = await LocalStorage.getItem<string>("saved-grids");
      if (stored) {
        setGrids(JSON.parse(stored));
      } else {
        // Use sample data for now
        setGrids(sampleGrids);
      }
    } catch {
      setGrids(sampleGrids);
    } finally {
      setIsLoading(false);
    }
  }

  async function openGrid(grid: SavedGrid) {
    await showToast({
      style: Toast.Style.Success,
      title: `Opening ${grid.name}`,
      message: `${grid.sites.length} sites in ${grid.layout} layout`,
    });

    // TODO: Implement gridview:// protocol to open specific saved grid
    // For now, just log the action
    console.log("Opening grid:", grid);
  }

  async function deleteGrid(grid: SavedGrid) {
    const confirmed = await confirmAlert({
      title: "Delete Grid?",
      message: `Are you sure you want to delete "${grid.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const updated = grids.filter((g) => g.id !== grid.id);
      setGrids(updated);
      await LocalStorage.setItem("saved-grids", JSON.stringify(updated));

      await showToast({
        style: Toast.Style.Success,
        title: "Grid deleted",
      });
    }
  }

  function getLayoutIcon(layout: string): Icon {
    if (layout.includes("2x2")) return Icon.AppWindowGrid2x2;
    if (layout.includes("1x")) return Icon.AppWindowList;
    return Icon.AppWindowGrid3x3;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your saved grids...">
      <List.Section title="Saved Grids" subtitle={`${grids.length} layouts`}>
        {grids.map((grid) => (
          <List.Item
            key={grid.id}
            icon={getLayoutIcon(grid.layout)}
            title={grid.name}
            subtitle={grid.description}
            accessories={[
              { text: `${grid.sites.length} sites` },
              { icon: Icon.Calendar, text: new Date(grid.createdAt).toLocaleDateString() },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open Grid" icon={Icon.Window} onAction={() => openGrid(grid)} />
                <Action
                  title="Delete Grid"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => deleteGrid(grid)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {!isLoading && grids.length === 0 && (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No saved grids yet"
          description="Save layouts in GridView Pro to see them here"
        />
      )}

      {grids.length > 0 && (
        <List.Section title="Info">
          <List.Item
            icon={Icon.Info}
            title="Grid Sync Coming Soon"
            subtitle="Direct integration with GridView Pro saved layouts"
          />
        </List.Section>
      )}
    </List>
  );
}
