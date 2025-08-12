import { LocalStorage, Grid, Action, ActionPanel, Icon } from "@raycast/api";

import { useEffect, useState } from "react";
export default function Command() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    async function fetchFavorites() {
      const stored = await LocalStorage.getItem("favorites");
      const favoritesString = typeof stored === "string" ? stored : "[]";
      setFavorites(JSON.parse(favoritesString));
    }
    fetchFavorites();
  }, []);

  function removeFromFavorites(id: string) {
    setFavorites((prev) => prev.filter((fav) => fav !== id));
  }

  return (
    <Grid columns={5}>
      {favorites.map((id: string) => (
        <Grid.Item
          key={id}
          id={id}
          content={`https://cdn2.thecatapi.com/images/${id}.jpg`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Image URL" content={`https://cdn2.thecatapi.com/images/${id}.jpg`} />
              <Action.OpenInBrowser
                title="Open in Browser"
                icon={Icon.Window}
                url={`https://cdn2.thecatapi.com/images/${id}.jpg`}
              />
              <Action title="Remove from Favorites" icon={Icon.Trash} onAction={() => removeFromFavorites(id)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
