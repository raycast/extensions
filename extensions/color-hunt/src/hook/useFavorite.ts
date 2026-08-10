import { useLocalStorage } from "@raycast/utils";
import { StorageData } from "../type";

export const useFavorite = () => {
  const { isLoading, value, setValue, removeValue } = useLocalStorage<StorageData[]>("favoritePalettes", []);

  const favorite = async (code: string, svg: string) => {
    if (!value) {
      return;
    }
    const data = value.filter((item) => item.code !== code);
    data.push({ code, svg });
    await setValue(data.sort());
  };

  const unFavorite = async (code: string) => {
    if (!value) {
      return;
    }
    const data = value.filter((item) => item.code !== code);
    await setValue(data.sort());
  };

  return {
    isLoading,
    value,
    favorite,
    unFavorite,
    removeValue,
  };
};
