import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
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

type EntityType = "Incident" | "Oncall" | "Escalation" | "Service" | "Integration";

const iconMap: Record<EntityType, string> = {
  Incident: "incident.png",
  Oncall: "oncall.png",
  Escalation: "escalation.png",
  Service: "service.png",
  Integration: "integration.png",
};

const getIcon = (entityType: string): string | Icon => {
  return (iconMap[entityType as EntityType] as string) || Icon.Star;
};

function FavoriteItem({ favorite }: { favorite: Favorite }) {
  return (
    <List.Item
      title={favorite.name}
      subtitle={favorite.counterId}
      icon={getIcon(favorite.entityType)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon={Icon.Globe} title="Open Favorite" url={`${config?.spike}${favorite.url}`} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFavorites() {
      try {
        setIsLoading(true);
        const response = await api.users.getFavorites();
        setFavorites(Object.values(response.favorites));
      } catch (err) {
        setError("Failed to fetch favorites. Please try again.");
        console.error("Error fetching favorites:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFavorites();
  }, []);

  const favoriteItems = useMemo(
    () => favorites.map((favorite) => <FavoriteItem key={favorite.entityId} favorite={favorite} />),
    [favorites],
  );

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return <List.EmptyView title="Error" description={error} />;
  }

  return (
    <List>
      <List.Section title="Favorites" subtitle={`${favorites.length} items`}>
        {favoriteItems}
      </List.Section>
    </List>
  );
}
