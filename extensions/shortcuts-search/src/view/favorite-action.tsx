import { Action, Icon } from "@raycast/api";
import { matchesFavorite, type FavoriteIdentifier } from "../user-data/favorites";
import type { Favorite } from "../user-data/models";

interface FavoriteActionProps {
  identifier: FavoriteIdentifier;
  favorites: Favorite[];
  onToggle: (identifier: FavoriteIdentifier) => Promise<void>;
}

export function FavoriteAction({ identifier, favorites, onToggle }: FavoriteActionProps) {
  const isFavorite = favorites.some((favorite) => matchesFavorite(favorite, identifier));

  return (
    <Action
      title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      icon={Icon.Star}
      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      onAction={() => onToggle(identifier)}
    />
  );
}
