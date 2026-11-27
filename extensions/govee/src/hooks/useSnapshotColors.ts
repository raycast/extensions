import { guessColors } from "@/lib/colorWords";

import useLocalStorage from "@/hooks/useLocalStorage";

export type SnapshotColors = {
  /** Circle colours for a snapshot: the ones set by hand, else colours guessed from its name. */
  colorsFor: (id: string, name: string) => { colors: string[]; custom: boolean };
  /** An empty list resets to the guess. */
  setColors: (id: string, hexes: string[]) => void;
  resetColor: (id: string) => void;
};

const key = (id: string) => id.toLowerCase();

// Older builds stored one hex string per snapshot; newer ones store a list.
const useSnapshotColors = (): SnapshotColors => {
  const { data, setData } = useLocalStorage<Record<string, string | string[]>>("snapshotColors", {});
  const resetColor = (id: string) =>
    setData((d) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key(id)]: _, ...rest } = d;
      return rest;
    });
  return {
    colorsFor: (id, name) => {
      const stored = data?.[key(id)];
      const custom = stored === undefined ? [] : ([] as string[]).concat(stored);
      return custom.length ? { colors: custom, custom: true } : { colors: guessColors(name), custom: false };
    },
    setColors: (id, hexes) => (hexes.length ? setData((d) => ({ ...d, [key(id)]: hexes })) : resetColor(id)),
    resetColor,
  };
};

export default useSnapshotColors;
