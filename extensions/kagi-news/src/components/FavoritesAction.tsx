// Shared action to add/remove a category from favorites (used by both commands)

import { Action, Icon, Color } from "@raycast/api";
import { useFavoriteCategories } from "../hooks/useFavoriteCategories";
import { CategoryItem } from "../interfaces";

interface FavoritesActionProps {
  category: CategoryItem | undefined;
}

export function FavoritesAction({ category }: FavoritesActionProps) {
  const { isFavorite, toggleFavorite } = useFavoriteCategories();

  if (!category) return null;

  return (
    <Action
      title={isFavorite(category.categoryId) ? "Remove from Favorites" : "Add to Favorites"}
      icon={isFavorite(category.categoryId) ? Icon.StarDisabled : { source: Icon.Star, tintColor: Color.Yellow }}
      onAction={() => toggleFavorite(category.categoryId)}
    />
  );
}
