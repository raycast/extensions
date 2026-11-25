import { getPreferenceValues, LocalStorage } from "@raycast/api";
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

/** The list as currently saved, not as this view last rendered it. */
async function savedList(key: string): Promise<string[]> {
  try {
    const raw = await LocalStorage.getItem<string>(key);
    const parsed: unknown = raw === undefined ? [] : JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

// Pin and history changes run one at a time, each starting from the latest
// saved list. A slow export finishing later can't restore an older snapshot
// or undo a clear that happened in the meantime.
let queue: Promise<unknown> = Promise.resolve();
function updateList(key: string, change: (current: string[]) => string[], save: (next: string[]) => Promise<void>) {
  const next = queue.then(async () => save(change(await savedList(key))));
  queue = next.catch(() => undefined);
  return next;
}

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
      updateList(
        "pins",
        (current) => (current.includes(s.key) ? current.filter((k) => k !== s.key) : [s.key, ...current]),
        pins.setValue,
      ),
    [pins.setValue],
  );

  const addRecent = useCallback(
    (s: OpenSymbol) =>
      updateList(
        "recents",
        (current) => [s.key, ...current.filter((k) => k !== s.key)].slice(0, MAX_RECENTS),
        recents.setValue,
      ),
    [recents.setValue],
  );

  const resolve = (keys: string[]) => keys.map((k) => byKey.get(k)).filter((s): s is OpenSymbol => Boolean(s));

  return {
    isLoading: pins.isLoading || recents.isLoading || weight.isLoading || gridSize.isLoading,
    pinned: resolve(pinKeys),
    recent: resolve(recentKeys),
    isPinned: (s: OpenSymbol) => pinKeys.includes(s.key),
    togglePin,
    addRecent,
    clearRecents: () => updateList("recents", () => [], recents.setValue),
    weight: WEIGHTS.includes(weight.value as Weight) ? (weight.value as Weight) : "regular",
    setWeight: weight.setValue,
    gridSize: (gridSize.value ?? "small") as GridSize,
    setGridSize: gridSize.setValue,
  };
}

export type SymbolState = ReturnType<typeof useSymbolState>;
