import { LocalStorage, Toast, showToast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { Character, createFavouriteSaver, normalizeCharacters } from "./api";

const STORAGE_KEY = "favourite-characters";
const favouriteSaves = createFavouriteSaver();

export function useFavourites() {
  // Shared state keeps the parent list and film/show views in sync.
  const [favourites, setFavourites] = useCachedState<Character[]>(STORAGE_KEY, []);
  const [isSaving, setIsSaving] = useState(false);
  const pendingSaves = useRef(0);
  const { isLoading } = usePromise(async () => {
    if (favouriteSaves.current() !== undefined) return;
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    const loaded = stored ? normalizeCharacters(JSON.parse(stored)) : [];
    if (favouriteSaves.initialize(loaded)) setFavourites(loaded);
  });

  async function toggle(character: Character) {
    if (isLoading) return;
    pendingSaves.current += 1;
    setIsSaving(true);
    try {
      await favouriteSaves.update(character, async (next) => {
        await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setFavourites(next);
      });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Save Favourites", message: String(error) });
    } finally {
      pendingSaves.current -= 1;
      if (pendingSaves.current === 0) setIsSaving(false);
    }
  }

  return { favourites, toggle, isLoading: isLoading || isSaving };
}
