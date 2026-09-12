import { Action, ActionPanel, List } from "@raycast/api";
import { ListItem } from "./components/ListItem";
import { useFavorites } from "./hooks/useFavorites";
import SearchModels from "./searchModels";
import { EntityType } from "./interfaces";

export interface FavoritesProps {
  type: EntityType;
}

export default function Favorites({ type }: FavoritesProps) {
  const [favorites, fetchFavorites] = useFavorites(type);

  return (
    <List searchBarPlaceholder="Filter your favorite models…">
      {favorites?.length ? (
        <List.Section title="Favorites" subtitle={favorites.length.toString()}>
          {favorites.map((model) => {
            return (
              <ListItem
                key={model.id}
                type={type}
                model={model}
                isFavorited={favorites.findIndex((item) => item.id === model.id) !== -1}
                handleFavoriteChange={fetchFavorites}
                isViewingFavorites
              />
            );
          })}
        </List.Section>
      ) : (
        <List.EmptyView
          title="No favorites yet. Search for a model to add it to your favorites."
          actions={
            <ActionPanel>
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.Push title="Search Hugging Face" target={<SearchModels />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
