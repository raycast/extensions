import { Route, Stop } from "../types";
import { LocalStorage, showToast, Toast } from "@raycast/api";

export async function addFavoriteStop(route: Route, directionId: String, stop: Stop) {
  let favorites: Stop[] = [];

  try {
    const _favorites = await LocalStorage.getItem<string>("favorite-stops");

    if (_favorites) {
      favorites = JSON.parse(_favorites);
    }
  } catch {
    console.info("No favorite stops");
  }

  try {
    await LocalStorage.setItem("favorite-stops", JSON.stringify([...favorites, { route: { attributes: JSON.stringify(route.attributes), id: route.id} , directionId, stop: { attributes: JSON.stringify(stop.attributes), id: stop.id}}]));

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
