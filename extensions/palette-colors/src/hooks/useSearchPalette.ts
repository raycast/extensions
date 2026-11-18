import { useMemo, useState } from "react";
import { SavedPalette } from "../types";

type UseSearchPaletteReturn = {
  setSearchText: (text: string) => void;
  filteredPalettes: SavedPalette[];
};

/**
 * Manages palette search functionality with text filtering.
 */
export function useSearchPalette(colorPalettes: SavedPalette[] | undefined): UseSearchPaletteReturn {
  const [searchText, setSearchText] = useState("");

  /**
   * Filters palettes by search text across name, description, and keywords.
   */
  const filteredPalettes = useMemo(() => {
    if (!colorPalettes?.length) return [];
    if (!searchText.trim()) return colorPalettes;

    const searchLower = searchText.toLowerCase();
    return colorPalettes.filter((palette) => {
      const matchesName = palette.name.toLowerCase().includes(searchLower);
      const matchesDescription = palette.description.toLowerCase().includes(searchLower);
      const matchesKeywords = palette.keywords?.some((keyword) => keyword.toLowerCase().includes(searchLower));

      return matchesName || matchesDescription || matchesKeywords;
    });
  }, [searchText, colorPalettes]);

  return {
    setSearchText,
    filteredPalettes,
  };
}
