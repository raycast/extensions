import { useCachedState } from "@raycast/utils";
import { isDeepStrictEqual } from "util";
import { layout } from "./preferences";
import { EntryLike, PinnedMovement } from "./types";

const GRID_COLUMNS = 6;

function getAllowedMovements(entries: EntryLike[], entry: EntryLike): PinnedMovement[] {
  const movements = new Array<PinnedMovement>();

  if (layout === "grid") {
    const index = entries.findIndex((e: EntryLike) => isDeepStrictEqual(e, entry));

    if (index >= GRID_COLUMNS && index % GRID_COLUMNS === 0) {
      movements.push("up");
    }

    if (index < Math.floor(entries.length / GRID_COLUMNS) * GRID_COLUMNS && (index + 1) % GRID_COLUMNS === 0) {
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
        const i = previousEntries.findIndex((e) => isDeepStrictEqual(e, entry));
        previousEntries.splice(i - 1, 2, previousEntries[i], previousEntries[i - 1]);
        return previousEntries;
      }),
    moveDown: (entry: EntryLike) =>
      setEntries((previousEntries) => {
        const i = previousEntries.findIndex((e) => isDeepStrictEqual(e, entry));
        previousEntries.splice(i, 2, previousEntries[i + 1], previousEntries[i]);
        return previousEntries;
      }),
    getAllowedMovements: (entry: EntryLike) => getAllowedMovements(entries, entry),
  };
}
