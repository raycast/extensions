import { LocalStorage, Grid, Action, ActionPanel, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { useEffect, useState } from "react";
export default function Command() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    async function fetchFavorites() {
      const stored = await LocalStorage.getItem("favorites");
      const favoritesString = typeof stored === "string" ? stored : "[]";
      try {
        setFavorites(JSON.parse(favoritesString));
      } catch (e) {
        setFavorites([]);
        console.error("Failed to parse favorites from local storage:", e);
        showFailureToast("Failed to load favorites");
      }
    }
    fetchFavorites();
  }, []);

  function removeFromFavorites(id: string) {
    setFavorites((prev) => {
      const updated = prev.filter((fav) => fav !== id);
      LocalStorage.setItem("favorites", JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <Grid columns={5}>
      {favorites.length === 0 ? (
        <Grid.EmptyView
          title="No Favorites Yet"
          description="Add some cat images to your favorites to see them here!"
          icon={Icon.Star}
        />
      ) : (
        favorites.map((id: string) => (
          <Grid.Item
            key={id}
            id={id}
            content={`https://cdn2.thecatapi.com/images/${id}.jpg`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Image URL"
                  content={`https://cdn2.thecatapi.com/images/${id}.jpg`}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  icon={Icon.Window}
                  url={`https://cdn2.thecatapi.com/images/${id}.jpg`}
                />
                <Action title="Remove from Favorites" icon={Icon.Trash} onAction={() => removeFromFavorites(id)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
