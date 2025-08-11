import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Erro ao carregar histórico",
        message: String(error),
      });
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Erro ao buscar no histórico",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(item: HistoryItem) {
    await copyToClipboard(item.masked || item.value, "Copiado com sucesso");
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
        title: "Item removido do histórico",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Erro ao remover item",
        message: String(error),
      });
    }
  }

  async function handleToggleFavorite(item: HistoryItem) {
    try {
      await toggleFavorite(item);
      await loadItems();
      await showToast({
        style: Toast.Style.Success,
        title: item.isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Erro ao alterar favorito",
        message: String(error),
      });
    }
  }

  async function handleClearHistory() {
    const options: Alert.Options = {
      title: "Limpar Todo o Histórico",
      message:
        "Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita e todos os itens serão perdidos.",
      primaryAction: {
        title: "Confirmar Limpeza",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        await clearHistory();
        await loadItems();
        await showToast({
          style: Toast.Style.Success,
          title: "Histórico limpo com sucesso",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Erro ao limpar o histórico",
          message: String(error),
        });
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
      case "certidão":
        return Icon.Document;
      case "cartão":
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
      searchBarPlaceholder="Buscar documentos no histórico..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filtrar por tipo"
          value={showFavoritesOnly ? "favorites" : "all"}
          onChange={(value) => setShowFavoritesOnly(value === "favorites")}
        >
          <List.Dropdown.Item title="Todos os Documentos" value="all" />
          <List.Dropdown.Item title="Apenas Favoritos" value="favorites" />
        </List.Dropdown>
      }
    >
      {items.length === 0 ? (
        <List.EmptyView
          title={showFavoritesOnly ? "Nenhum favorito encontrado" : "Histórico vazio"}
          description={
            showFavoritesOnly
              ? "Marque documentos como favoritos para vê-los aqui"
              : "Gere documentos para que apareçam no histórico"
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
              favoriteIds.has(item.id) ? { icon: Icon.Star, tooltip: "Favorito" } : {},
              { date: new Date(item.generatedAt), tooltip: "Gerado em" },
            ]}
            actions={
              <ActionPanel>
                <Action title="Colar No App Ativo" icon={Icon.Clipboard} onAction={() => handlePaste(item)} />
                <Action
                  title="Copiar Para Área De Transferência"
                  icon={Icon.CopyClipboard}
                  onAction={() => handleCopy(item)}
                />
                <Action
                  title={favoriteIds.has(item.id) ? "Remover Dos Favoritos" : "Marcar Como Favorito"}
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  onAction={() => handleToggleFavorite(item)}
                />
                <ActionPanel.Section>
                  <Action
                    title="Remover Este Item"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    onAction={() => handleDelete(item)}
                  />
                  <Action
                    title="Limpar Histórico Completo"
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
