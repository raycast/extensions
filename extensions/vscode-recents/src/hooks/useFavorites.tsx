import { LocalStorage, PopToRootType, closeMainWindow } from "@raycast/api";
import useSWR from "swr";
import { runAppleScript } from "@raycast/utils";
import { Favorite } from "../types/favorite";

const STORAGE_KEY = "projects";

async function addFavorite(project: Favorite) {
  const favorites = await listFavorites();

  LocalStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites, project]));
}

function setFavorites(projects: Favorite[]) {
  LocalStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

async function listFavorites(): Promise<Favorite[]> {
  const rawFavoritos = await LocalStorage.getItem(STORAGE_KEY);

  return JSON.parse((rawFavoritos as string) || "[]");
}

async function removeFavorite(id: string) {
  const favorites = await listFavorites();
  const filteredFavorites = favorites.filter((favorite) => favorite.id !== id);

  setFavorites(filteredFavorites);
}

async function openInVSCode(id: string) {
    const favorites = await listFavorites();
    const favorite = favorites.find((favorite) => favorite.id === id);
    
    if (favorite) {
        runAppleScript(`tell application "Visual Studio Code" to open "${favorite.path}"`);
    }

    closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
    });
}

export function useFavorites() {
  const { data: favorites = [], mutate: refresh } = useSWR(STORAGE_KEY, listFavorites);

  return {
    add: addFavorite,
    remove: removeFavorite,
    refresh,
    open: openInVSCode,
    favorites,
};
}
