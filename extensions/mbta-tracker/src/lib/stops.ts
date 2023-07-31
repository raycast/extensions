import { Favorite, Route, Stop } from "../types";
import { LocalStorage, showToast, Toast } from "@raycast/api";

export async function addFavoriteStop(route: Route, directionId: 0 | 1, stop: Stop) {
  let favorites: Favorite[] = [];

  try {
    const _favorites = await LocalStorage.getItem<string>("favorite-stops");

    if (_favorites) {
      favorites = JSON.parse(_favorites);
    }
  } catch {
    console.info("No favorite stops");
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
