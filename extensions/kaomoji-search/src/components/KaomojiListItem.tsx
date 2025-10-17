import { List } from "@raycast/api";
import { KaomojiActions } from "./KaomojiActions";
import { SearchResult } from "../types";

interface KaomojiListItemProps {
  searchResult: SearchResult;
  primaryAction: Preferences["primaryAction"];
  toggleFavorite: (kaomoji: SearchResult) => void;
  isFavorite: (kaomoji: SearchResult) => boolean;
}

export function KaomojiListItem({ searchResult, primaryAction, toggleFavorite, isFavorite }: KaomojiListItemProps) {
  return (
    <List.Item
      title={searchResult.name}
      accessories={[{ text: searchResult.description }]}
      actions={
        <KaomojiActions
          searchResult={searchResult}
          primaryAction={primaryAction}
          toggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
        />
      }
    />
  );
}
