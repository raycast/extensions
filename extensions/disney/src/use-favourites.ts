import { LocalStorage, Toast, showToast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { Character, normalizeCharacters, toggleFavourite } from "./api";

const STORAGE_KEY = "favourite-characters";

export function useFavourites() {
  // Shared state keeps the parent list and film/show views in sync.
  const [favourites, setFavourites] = useCachedState<Character[]>(STORAGE_KEY, []);
  const saving = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isLoading } = usePromise(async () => {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    setFavourites(stored ? normalizeCharacters(JSON.parse(stored)) : []);
  });

  async function toggle(character: Character) {
    if (saving.current || isLoading) return;
    saving.current = true;
    setIsSaving(true);
    try {
      const next = toggleFavourite(favourites, character);
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setFavourites(next);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Save Favourites", message: String(error) });
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  return { favourites, toggle, isLoading: isLoading || isSaving };
}
