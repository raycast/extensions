import { LocalStorage } from "@raycast/api";
import { Episode } from "../types";

export const removeFromFavourites = async (data: Episode) => {
  if (!data) {
    console.error("Error removing from favourites: data is undefined");
    return;
  }

  try {
    const favourites = await LocalStorage.getItem("favourites");
    const favouritesArray = typeof favourites === "string" ? (JSON.parse(favourites) as Episode[]) : [];
    const updatedFavourites = favouritesArray.filter((favourite) => favourite.episode_alias !== data.episode_alias);

    await LocalStorage.setItem("favourites", JSON.stringify(updatedFavourites));
    console.log("Removed from favourites", await LocalStorage.getItem("favourites"));

    return updatedFavourites;
  } catch (error) {
    console.error("Error removing from favourites:", error);
    return null;
  }
};
