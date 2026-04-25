import { useLocalStorage } from "@raycast/utils";
import { SavedPalette } from "../types";

type UseColorPalettesReturn = {
  colorPalettes: SavedPalette[] | undefined;
  setColorPalettes: (palettes: SavedPalette[]) => Promise<void>;
  isLoading: boolean;
};

/**
 * Manages color palettes in local storage.
 */
export function useColorPalettes(): UseColorPalettesReturn {
  const {
    value: colorPalettes,
    setValue: setColorPalettes,
    isLoading,
  } = useLocalStorage<SavedPalette[]>("color-palettes-list", []);

  return {
    colorPalettes,
    setColorPalettes,
    isLoading,
  };
}
