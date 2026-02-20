import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation, LocalStorage, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchRecitations } from "./lib/api";
import { Recitation } from "./types";
import { useMemo } from "react";
import { FAV_RECITER_KEY } from "./lib/constants";

export default function Command() {
  const { data: recitations, isLoading: isRecitationsLoading } = useCachedPromise(fetchRecitations);
  const {
    data: favorites,
    isLoading: isFavsLoading,
    mutate: mutateFavs,
  } = useCachedPromise(async () => {
    const favs = await LocalStorage.getItem<string>(FAV_RECITER_KEY);
    return favs ? (JSON.parse(favs) as number[]) : [];
  });
  const { pop } = useNavigation();

  const isLoading = isRecitationsLoading || isFavsLoading;

  const sortedRecitations = useMemo(() => {
    if (!recitations) return [];
    if (!favorites) return recitations;

    return [...recitations].sort((a, b) => {
      const aIsFav = favorites.includes(a.id);
      const bIsFav = favorites.includes(b.id);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
      return a.reciter_name.localeCompare(b.reciter_name);
    });
  }, [recitations, favorites]);

  async function toggleFavorite(reciterId: number) {
    if (!favorites) return;
    const newFavs = favorites.includes(reciterId)
      ? favorites.filter((id) => id !== reciterId)
      : [...favorites, reciterId];

    await LocalStorage.setItem(FAV_RECITER_KEY, JSON.stringify(newFavs));
    await mutateFavs(Promise.resolve(newFavs));
  }

  async function handleSetDefault(recitation: Recitation) {
    try {
      await LocalStorage.setItem("defaultReciterId", recitation.id.toString());
      await LocalStorage.setItem("defaultReciterName", recitation.reciter_name);

      await showToast({
        style: Toast.Style.Success,
        title: "Default Reciter Set",
        message: `${recitation.reciter_name} (${recitation.style})`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set default reciter",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search reciters...">
      {sortedRecitations.map((recitation: Recitation) => {
        const isFavorite = favorites?.includes(recitation.id);
        return (
          <List.Item
            key={recitation.id}
            title={recitation.reciter_name}
            subtitle={recitation.style}
            icon={{ source: Icon.Person, tintColor: isFavorite ? Color.Yellow : undefined }}
            accessories={isFavorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []}
            actions={
              <ActionPanel>
                <Action title="Set as Default" icon={Icon.Checkmark} onAction={() => handleSetDefault(recitation)} />
                <Action
                  title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  onAction={() => toggleFavorite(recitation.id)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
