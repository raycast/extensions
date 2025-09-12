import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import {
  clearHistory,
  getFavorites,
  getHistory,
  HistoryItem,
  removeFromHistory,
  searchHistory,
  toggleFavorite,
} from "./lib/storage/history";
import { copyToClipboard, pasteToFrontmostApp } from "./lib/utils/clipboard";

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (searchText) {
      searchItems();
    } else {
      loadItems();
    }
  }, [searchText, showFavoritesOnly]);

  async function loadItems() {
    setIsLoading(true);
    try {
      if (showFavoritesOnly) {
        const favs = await getFavorites();
        setItems(favs);
      } else {
        const history = await getHistory();
        setItems(history);
      }
      const favs = await getFavorites();
      setFavorites(favs);
    } catch (error) {
      await showFailureToast(error, { title: "Error loading history" });
    } finally {
      setIsLoading(false);
    }
  }

  async function searchItems() {
    setIsLoading(true);
    try {
      const results = await searchHistory(searchText);
      if (showFavoritesOnly) {
        const favs = await getFavorites();
        const favoriteIds = new Set(favs.map((f) => f.id));
        setItems(results.filter((item) => favoriteIds.has(item.id)));
      } else {
        setItems(results);
      }
    } catch (error) {
      await showFailureToast(error, { title: "Error searching history" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(item: HistoryItem) {
    await copyToClipboard(item.masked || item.value, "Copied successfully");
  }

  async function handlePaste(item: HistoryItem) {
    await pasteToFrontmostApp(item.masked || item.value);
  }

  async function handleDelete(item: HistoryItem) {
    try {
      await removeFromHistory(item.id);
      await loadItems();
      await showToast({
        style: Toast.Style.Success,
        title: "Item removed from history",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Error removing item" });
    }
  }

  async function handleToggleFavorite(item: HistoryItem) {
    try {
      await toggleFavorite(item);
      await loadItems();
      await showToast({
        style: Toast.Style.Success,
        title: item.isFavorite ? "Removed from favorites" : "Added to favorites",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Error changing favorite" });
    }
  }

  async function handleClearHistory() {
    const options: Alert.Options = {
      title: "Clear All History",
      message: "Are you sure you want to clear all history? This action cannot be undone and all items will be lost.",
      primaryAction: {
        title: "Confirm Clear",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        await clearHistory();
        await loadItems();
        await showToast({
          style: Toast.Style.Success,
          title: "History cleared successfully",
        });
      } catch (error) {
        await showFailureToast(error, { title: "Error clearing history" });
      }
    }
  }

  function getItemSubtitle(item: HistoryItem): string {
    const parts = [item.type];
    if (item.metadata) {
      if (item.metadata.state) parts.push(String(item.metadata.state));
      if (item.metadata.tipo) parts.push(String(item.metadata.tipo));
      if (item.metadata.brand) parts.push(String(item.metadata.brand));
    }
    return parts.join(" • ");
  }

  function getItemIcon(type: string): Icon {
    switch (type.toLowerCase()) {
      case "cpf":
        return Icon.Person;
      case "cnpj":
        return Icon.Building;
      case "cnh":
        return Icon.Car;
      case "certificate":
        return Icon.Document;
      case "card":
        return Icon.CreditCard;
      default:
        return Icon.Document;
    }
  }

  const favoriteIds = new Set(favorites.map((f) => f.id));

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search documents in history..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by type"
          value={showFavoritesOnly ? "favorites" : "all"}
          onChange={(value) => setShowFavoritesOnly(value === "favorites")}
        >
          <List.Dropdown.Item title="All Documents" value="all" />
          <List.Dropdown.Item title="Favorites Only" value="favorites" />
        </List.Dropdown>
      }
    >
      {items.length === 0 ? (
        <List.EmptyView
          title={showFavoritesOnly ? "No favorites found" : "History empty"}
          description={
            showFavoritesOnly
              ? "Mark documents as favorites to see them here"
              : "Generate documents to appear in history"
          }
        />
      ) : (
        items.map((item) => (
          <List.Item
            key={item.id}
            icon={getItemIcon(item.type)}
            title={item.masked || item.value}
            subtitle={getItemSubtitle(item)}
            accessories={[
              favoriteIds.has(item.id) ? { icon: Icon.Star, tooltip: "Favorite" } : {},
              { date: new Date(item.generatedAt), tooltip: "Generated on" },
            ]}
            actions={
              <ActionPanel>
                <Action title="Paste to Active App" icon={Icon.Clipboard} onAction={() => handlePaste(item)} />
                <Action title="Copy to Clipboard" icon={Icon.CopyClipboard} onAction={() => handleCopy(item)} />
                <Action
                  title={favoriteIds.has(item.id) ? "Remove from Favorites" : "Mark as Favorite"}
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  onAction={() => handleToggleFavorite(item)}
                />
                <ActionPanel.Section>
                  <Action
                    title="Remove This Item"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    onAction={() => handleDelete(item)}
                  />
                  <Action
                    title="Clear Complete History"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    onAction={handleClearHistory}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
