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

      console.log("-----Fav 1------");
      console.log(favorites[0].route.id);
      console.log(favorites[0].directionId);
      console.log(favorites[0].stop.id);

      console.log(
        favorites[0].route.id !== favoriteToDelete.route.id &&
          favorites[0].directionId !== favoriteToDelete.directionId &&
          favorites[0].stop.id !== favoriteToDelete.stop.id
      );
      console.log("-----Fav 2------");
      console.log(favorites[1].route.id);
      console.log(favorites[1].directionId);
      console.log(favorites[1].stop.id);

      console.log(
        favorites[1].route.id !== favoriteToDelete.route.id &&
          favorites[1].directionId !== favoriteToDelete.directionId &&
          favorites[1].stop.id !== favoriteToDelete.stop.id
      );
      console.log("-----Fav 3------");
      console.log(favorites[2].route.id);
      console.log(favorites[2].directionId);
      console.log(favorites[2].stop.id);

      console.log(
        favorites[2].route.id !== favoriteToDelete.route.id &&
          favorites[2].directionId !== favoriteToDelete.directionId &&
          favorites[2].stop.id !== favoriteToDelete.stop.id
      );
      console.log("-----Delete------");
      console.log(favoriteToDelete.route.id);
      console.log(favoriteToDelete.directionId);
      console.log(favoriteToDelete.stop.id);

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

      // console.log(favoriteToDelete);
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
