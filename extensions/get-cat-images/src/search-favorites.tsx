import { Grid, Action, ActionPanel, Icon, Keyboard } from "@raycast/api";

import { useFavorites } from "./lib/useFavorites";

const linkURL = (id: string) => `https://cdn2.thecatapi.com/images/${encodeURIComponent(id)}.jpg`;

export default function Command() {
  const [favorites, , , removeFavorite, isFavoritesLoading] = useFavorites();

  return (
    <Grid columns={5} isLoading={isFavoritesLoading}>
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
                <Action
                  title="Remove from Favorites"
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  icon={Icon.Trash}
                  onAction={() => removeFavorite(id)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
