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

export async function removeFavoriteStop(favoriteToDelete: Favorite) {
  try {
    const _favorites = await LocalStorage.getItem<string>("favorite-stops");

    if (_favorites) {
      const favorites: Favorite[] = JSON.parse(_favorites);

      favorites.forEach((favorite) => {
        console.log("---Fav---");
        console.log(favorite.route.id);
        console.log(favorite.directionId);
        console.log(favorite.stop.id);
      });

      await LocalStorage.setItem(
        "favorite-stops",
        JSON.stringify(
          favorites.filter(
            (favorite) =>
              favorite.route.id !== favoriteToDelete.route.id &&
              favorite.directionId !== favoriteToDelete.directionId &&
              favorite.stop.id !== favoriteToDelete.stop.id
          )
        )
      );

      console.log("---Fav to delete---");
      console.log(favoriteToDelete.route.id);
      console.log(favoriteToDelete.directionId);
      console.log(favoriteToDelete.stop.id);
      console.log("---Storage---");
      console.log(await LocalStorage.getItem<string>("favorite-stops"));
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
