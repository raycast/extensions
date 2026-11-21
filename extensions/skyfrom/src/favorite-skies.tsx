import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { FavoriteForm, RemoveFavoriteAction } from "./components/selection-actions";
import { ExploreAction, SkyDetail } from "./components/sky-detail";
import { messageFor, withToast } from "./lib/command-ui";
import { countryName, useAsDefault, useLocations } from "./lib/locations";
import { timeLabel } from "./lib/time";

export default function FavoriteSkies() {
  const { favorites, defaultFavorite, isLoading, error } = useLocations();
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search favorite skies…">
      <List.EmptyView
        title={error ? "Couldn’t Load Favorites" : "No Favorite Skies"}
        description={error ? messageFor(error) : "Add a favorite from Explore Sky or a sky preview."}
        icon={Icon.Star}
        actions={
          <ActionPanel>
            <ExploreAction />
          </ActionPanel>
        }
      />
      {favorites.map((favorite) => (
        <List.Item
          key={favorite.id}
          id={favorite.id}
          icon={Icon.Star}
          title={favorite.name}
          subtitle={timeLabel(favorite.time)}
          keywords={[favorite.city.name, countryName(favorite.city), favorite.city.slug]}
          accessories={favorite.id === defaultFavorite ? [{ text: "Default" }] : []}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Sky Details"
                icon={Icon.Eye}
                target={<SkyDetail selection={favorite} pushed />}
              />
              <Action.Push
                title="Rename Favorite"
                icon={Icon.Pencil}
                target={<FavoriteForm selection={favorite} favorite={favorite} />}
              />
              <Action
                title="Use Favorite as Default"
                icon={Icon.Pin}
                onAction={() =>
                  withToast(
                    "Saving default…",
                    "Couldn’t save default",
                    () => useAsDefault({ kind: "favorite", id: favorite.id }),
                    () => "Default favorite saved",
                  )
                }
              />
              <RemoveFavoriteAction id={favorite.id} />
              <ExploreAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
