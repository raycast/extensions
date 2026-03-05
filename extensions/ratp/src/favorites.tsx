import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import {
  DeparturesView,
  FavoriteStation,
  favoriteKey,
  favoriteLabel,
} from "./search-station";

export default function Favorites() {
  const { push } = useNavigation();
  const {
    value: favorites,
    setValue: setFavorites,
    isLoading,
  } = useLocalStorage<FavoriteStation[]>("favorite-stations", []);
  const favs = favorites ?? [];

  function removeFavorite(fav: FavoriteStation) {
    const key = favoriteKey(fav);
    setFavorites(favs.filter((f) => favoriteKey(f) !== key));
    showToast({ style: Toast.Style.Success, title: "Removed from Favorites" });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter favorites...">
      {favs.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No Favorites"
          description="Add favorites from the Search Station command"
        />
      ) : (
        <List.Section
          title="Favorites"
          subtitle={`${favs.length} station${favs.length > 1 ? "s" : ""}`}
        >
          {favs.map((fav) => (
            <List.Item
              key={favoriteKey(fav)}
              icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              title={favoriteLabel(fav)}
              subtitle={fav.region}
              accessories={[{ icon: Icon.ChevronRight }]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Upcoming Departures"
                    icon={Icon.Train}
                    onAction={() =>
                      push(
                        <DeparturesView
                          stopArea={{ id: fav.id, name: fav.name }}
                          initialFilter={fav.filter}
                          favorites={favs}
                          setFavorites={setFavorites}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={() => removeFavorite(fav)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
