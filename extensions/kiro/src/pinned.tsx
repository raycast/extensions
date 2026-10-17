import { isDeepStrictEqual } from "util";
import { EntryLike, PinnedMovement } from "./types";
import { layout } from "./preferences";
import { useCachedState } from "@raycast/utils";

const GRID_COLUMNS = 6;

function getAllowedMovements(entries: EntryLike[], entry: EntryLike): PinnedMovement[] {
  const movements = new Array<PinnedMovement>();

  if (layout === "grid") {
    const index = entries.findIndex((e: EntryLike) => isDeepStrictEqual(e, entry));

    if (index >= GRID_COLUMNS && index % GRID_COLUMNS === 0) {
      movements.push("up");
    }

    if (index + GRID_COLUMNS < entries.length) {
      movements.push("down");
    }

    if (index !== entries.length - 1) {
      movements.push("right");
    }

    if (index !== 0) {
      movements.push("left");
    }
  } else {
    const index = entries.findIndex((e: EntryLike) => isDeepStrictEqual(e, entry));

    if (index !== entries.length - 1) {
      movements.push("down");
    }

    if (index !== 0) {
      movements.push("up");
    }
  }

  return movements;
}

export function usePinnedEntries() {
  const [entries, setEntries] = useCachedState<EntryLike[]>("pinned", []);
  return {
    pinnedEntries: entries,
    pin: (entry: EntryLike) =>
      setEntries((previousEntries) => [entry, ...previousEntries.filter((e) => !isDeepStrictEqual(e, entry))]),
    unpin: (entry: EntryLike) =>
      setEntries((previousEntries) => previousEntries.filter((e) => !isDeepStrictEqual(e, entry))),
    unpinAll: () => setEntries([]),
    moveUp: (entry: EntryLike) =>
      setEntries((previousEntries) => {
        const newEntries = [...previousEntries];
        const i = newEntries.findIndex((e) => isDeepStrictEqual(e, entry));
        if (i > 0) {
          [newEntries[i - 1], newEntries[i]] = [newEntries[i], newEntries[i - 1]];
        }
        return newEntries;
      }),
    moveDown: (entry: EntryLike) =>
      setEntries((previousEntries) => {
        const newEntries = [...previousEntries];
        const i = newEntries.findIndex((e) => isDeepStrictEqual(e, entry));
        if (i < newEntries.length - 1) {
          [newEntries[i], newEntries[i + 1]] = [newEntries[i + 1], newEntries[i]];
        }
        return newEntries;
      }),
    getAllowedMovements: (entry: EntryLike) => getAllowedMovements(entries, entry),
  };
}
