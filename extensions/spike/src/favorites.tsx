import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import api from "./api";
import config from "./config";

interface Favorite {
  entityId: string;
  entityType: string;
  name: string;
  teamUid: string;
  team: string;
  url: string;
  counterId?: string;
}

const getIcon = (): string | Icon => {
  return Icon.Star;
};

function FavoriteItem({ favorite }: { favorite: Favorite }) {
  return (
    <List.Item
      title={favorite.name}
      subtitle={favorite.counterId}
      icon={getIcon()}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon={Icon.Globe} title="Open Favorite" url={`${config?.spike}${favorite.url}`} />
        </ActionPanel>
      }
    />
  );
}

interface FavoritesResponse {
  favorites: Record<string, Favorite>;
}

export default function Command() {
  const { data, isLoading, error } = useCachedPromise<() => Promise<FavoritesResponse>>(
    async () => {
      return await api.users.getFavorites();
    },
    [],
    {
      onError: (err) => {
        console.error("Error fetching favorites:", err);
      },
    },
  );

  const favorites = useMemo(() => (data ? Object.values(data.favorites) : []), [data]);

  const favoriteItems = useMemo(
    () => favorites.map((favorite) => <FavoriteItem key={favorite.entityId} favorite={favorite} />),
    [favorites],
  );

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return <List.EmptyView title="Error" description="Failed to fetch favorites. Please try again." />;
  }

  return (
    <List>
      <List.Section title="Favorites" subtitle={`${favorites.length} items`}>
        {favoriteItems}
      </List.Section>
    </List>
  );
}
