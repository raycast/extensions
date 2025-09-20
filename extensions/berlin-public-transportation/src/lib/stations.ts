import axios from "axios";
import { API_URL } from "./constants";
import { IStation } from "../types";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { mutate } from "swr";

export async function getStations(search: string) {
  if (!search || typeof search !== "string" || search.length < 3) {
    return [];
  }

  return axios.get<IStation[]>(API_URL + `/stops?query=${search}&fuzzy=true`).then((res) => res.data);
}

export async function getFavoritStations(): Promise<IStation[]> {
  try {
    const _stations = await LocalStorage.getItem<string>("favorite-stations");

    if (_stations) {
      return JSON.parse(_stations);
    }
  } catch {
    console.info("No favorite stations");
  }

  return [];
}

export async function addStationToFavorites(station: IStation) {
  let favorites: IStation[] = [];

  try {
    const _favorites = await LocalStorage.getItem<string>("favorite-stations");

    if (_favorites) {
      favorites = JSON.parse(_favorites);
    }
  } catch {
    console.info("No favorite stations");
  }

  try {
    await LocalStorage.setItem("favorite-stations", JSON.stringify([...favorites, station]));

    showToast({
      title: `Added ${station.name} to favorite stations`,
      style: Toast.Style.Success,
    });

    mutate("favorite-stations");
  } catch {
    showToast({
      title: "Failed to add to favorite stations",
      style: Toast.Style.Failure,
    });
  }
}

export async function removeStationFromFavorites(station: IStation) {
  try {
    const _favorites = await LocalStorage.getItem<string>("favorite-stations");

    if (_favorites) {
      const favorites: IStation[] = JSON.parse(_favorites);

      await LocalStorage.setItem("favorite-stations", JSON.stringify(favorites.filter(({ id }) => id !== station.id)));

      showToast({
        title: `Removed ${station.name} from favorite stations`,
        style: Toast.Style.Success,
      });

      mutate("favorite-stations");
    }
  } catch {
    showToast({
      title: "Failed to remove from favorite stations",
      style: Toast.Style.Failure,
    });
  }
}
