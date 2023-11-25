import { Favorite, Route, Stop } from "../types";
import { LocalStorage, showToast, Toast } from "@raycast/api";

export async function addFavoriteStop(route: Route, directionId: number, stop: Stop) {
  let favorites: Favorite[] = [];

  try {
    const _favorites = await LocalStorage.getItem<string>("favorite-stops");

    if (_favorites) {
      favorites = JSON.parse(_favorites);
    }
  } catch {
    console.info("No favorite stops");
  }

  if (
    favorites.some(
      (favorite) =>
        favorite.route.id === route.id && favorite.directionId === directionId && favorite.stop.id === stop.id
    )
  ) {
    showToast({
      title: "Stop has already been added to favorites",
      style: Toast.Style.Failure,
    });
    return;
  }

  try {
    await LocalStorage.setItem(
      "favorite-stops",
      JSON.stringify([
        ...favorites,
        {
          route,
          directionId,
          stop,
        },
      ])
    );

    showToast({
      title: `Added ${stop.attributes.name} to favorite stops`,
      style: Toast.Style.Success,
    });
  } catch {
    showToast({
      title: "Failed to add to favorite stops",
      style: Toast.Style.Failure,
    });
  }
}

export async function removeFavoriteStop(favoriteToDelete: Favorite) {
  try {
    const _favorites = await LocalStorage.getItem<string>("favorite-stops");

    if (_favorites) {
      const favorites: Favorite[] = JSON.parse(_favorites);

      await LocalStorage.setItem(
        "favorite-stops",
        JSON.stringify(
          favorites.filter(
            (favorite) =>
              favorite.route.id !== favoriteToDelete.route.id ||
              favorite.directionId !== favoriteToDelete.directionId ||
              favorite.stop.id !== favoriteToDelete.stop.id
          )
        )
      );

      showToast({
        title: `Removed ${favoriteToDelete.stop.attributes.name} from favorite stops`,
        style: Toast.Style.Success,
      });
    }
  } catch {
    showToast({
      title: "Failed to remove from favorite stops",
      style: Toast.Style.Failure,
    });
  }
}
