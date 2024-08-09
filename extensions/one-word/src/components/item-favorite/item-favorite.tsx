import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { MENU, STORE } from "../../constants";
import { MenuBarPreferences, WordEntryProps } from "../../types";
import { debugLog } from "../../utils";

const ItemFavorite: React.FC<WordEntryProps> = ({ wordEntry }) => {
  const { value: favorites, setValue: setFavorites } = useLocalStorage<WordEntry[]>(STORE.FAVORITES, []);
  const preferences = getPreferenceValues<ExtensionPreferences & MenuBarPreferences>();

  const toggleFavorite = async () => {
    if (!favorites) return debugLog("❌ No favorites. Return");
    if (!wordEntry) return debugLog("❌ No wordEntry. Return");

    if (isFavorite) {
      const updatedFavorites = favorites.filter((favoriteEntry) => favoriteEntry.word !== wordEntry.word);
      await setFavorites(updatedFavorites);
      return;
    }

    await setFavorites([...favorites, wordEntry]);
  };

  const isFavorite = favorites?.some((favoriteEntry) => favoriteEntry.word === wordEntry?.word) ?? false;

  if (!preferences.showFav) return;

  return <MenuBarExtra.Item {...MENU[isFavorite ? "unfavorite" : "favorite"]} onAction={toggleFavorite} />;
};

export default ItemFavorite;
