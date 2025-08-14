import { LocalStorage, Grid, Action, ActionPanel, Icon } from "@raycast/api";

import { useFavorites } from "./lib/useFavorites";

const linkURL = (id: string) => `https://cdn2.thecatapi.com/images/${encodeURIComponent(id)}.jpg`;

export default function Command() {
  const [favorites, setFavorites] = useFavorites();

  function removeFromFavorites(id: string) {
    const updated = new Set(Array.from(favorites).filter((fav) => fav !== id));
    LocalStorage.setItem("favorites", JSON.stringify(Array.from(updated)));
    setFavorites(updated);
  }

  return (
    <Grid columns={5}>
      {favorites.size === 0 ? (
        <Grid.EmptyView
          title="No Favorites Yet"
          description="Add some cat images to your favorites to see them here!"
          icon={Icon.Star}
        />
      ) : (
        Array.from(favorites).map((id: string) => (
          <Grid.Item
            key={id}
            id={id}
            content={linkURL(id)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Image URL" content={linkURL(id)} />
                <Action.OpenInBrowser title="Open in Browser" icon={Icon.Window} url={linkURL(id)} />
                <Action title="Remove from Favorites" icon={Icon.Trash} onAction={() => removeFromFavorites(id)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
