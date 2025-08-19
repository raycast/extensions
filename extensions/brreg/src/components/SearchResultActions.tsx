import { Action } from "@raycast/api";
import { Enhet } from "../types";
import EmojiActionMenu from "./EmojiActionMenu";
import React from "react";

interface SearchResultActionsProps {
  entity: Enhet;
  isFavorite: boolean;
  favoriteEntity?: Enhet;
  onAddFavorite: (entity: Enhet) => void;
  onRemoveFavorite: (entity: Enhet) => void;
  onUpdateEmoji: (entity: Enhet, emoji?: string) => void;
  onResetToFavicon: (entity: Enhet) => void;
  onRefreshFavicon: (entity: Enhet) => void;
}

function SearchResultActions({
  entity,
  isFavorite,
  favoriteEntity,
  onAddFavorite,
  onRemoveFavorite,
  onUpdateEmoji,
  onResetToFavicon,
  onRefreshFavicon,
}: SearchResultActionsProps) {
  if (isFavorite && favoriteEntity) {
    return (
      <>
        <Action
          title="Remove from Favorites"
          onAction={() => onRemoveFavorite(entity)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
        <EmojiActionMenu
          entity={entity}
          currentEmoji={favoriteEntity.emoji}
          onUpdateEmoji={onUpdateEmoji}
          onResetToFavicon={onResetToFavicon}
          onRefreshFavicon={onRefreshFavicon}
        />
      </>
    );
  }

  return (
    <Action
      title="Add to Favorites"
      onAction={() => onAddFavorite(entity)}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
    />
  );
}

// Memoize component for better performance
export default React.memo(SearchResultActions);
