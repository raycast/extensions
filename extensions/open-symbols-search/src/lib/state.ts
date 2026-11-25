import { getPreferenceValues } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback } from "react";
import { getCatalog, OpenSymbol } from "./data";
import { Weight, WEIGHTS } from "./render";

// Preference types come from raycast-env.d.ts, which Raycast generates from package.json.
export type PrimaryAction = Preferences["primaryAction"];
export type GridSize = Preferences["gridSize"];

export const prefs = () => getPreferenceValues<Preferences>();

export const GRID_COLUMNS: Record<GridSize, number> = { small: 8, medium: 6, large: 4 };

const MAX_RECENTS = 24;

/** Pins, recents, weight and grid size, persisted in LocalStorage. */
export function useSymbolState() {
  const { byKey } = getCatalog();
  const pins = useLocalStorage<string[]>("pins", []);
  const recents = useLocalStorage<string[]>("recents", []);
  const weight = useLocalStorage<Weight>("weight", "regular");
  const gridSize = useLocalStorage<GridSize>("gridSize", prefs().gridSize ?? "small");

  const pinKeys = pins.value ?? [];
  const recentKeys = recents.value ?? [];

  const togglePin = useCallback(
    (s: OpenSymbol) =>
      pins.setValue(pinKeys.includes(s.key) ? pinKeys.filter((k) => k !== s.key) : [s.key, ...pinKeys]),
    [pinKeys, pins.setValue],
  );

  const addRecent = useCallback(
    (s: OpenSymbol) => recents.setValue([s.key, ...recentKeys.filter((k) => k !== s.key)].slice(0, MAX_RECENTS)),
    [recentKeys, recents.setValue],
  );

  const resolve = (keys: string[]) => keys.map((k) => byKey.get(k)).filter((s): s is OpenSymbol => Boolean(s));

  return {
    isLoading: pins.isLoading || recents.isLoading || weight.isLoading || gridSize.isLoading,
    pinned: resolve(pinKeys),
    recent: resolve(recentKeys),
    isPinned: (s: OpenSymbol) => pinKeys.includes(s.key),
    togglePin,
    addRecent,
    clearRecents: () => recents.setValue([]),
    weight: WEIGHTS.includes(weight.value as Weight) ? (weight.value as Weight) : "regular",
    setWeight: weight.setValue,
    gridSize: (gridSize.value ?? "small") as GridSize,
    setGridSize: gridSize.setValue,
  };
}

export type SymbolState = ReturnType<typeof useSymbolState>;
