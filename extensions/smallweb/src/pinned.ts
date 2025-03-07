import { useCachedState } from "@raycast/utils";
import { isDeepStrictEqual } from "util";

export type PinnedEntry = {
    domain: string;
};

export type PinMethods = {
    pin: (entry: PinnedEntry) => void;
    moveUp: (entry: PinnedEntry) => void;
    moveDown: (entry: PinnedEntry) => void;
    unpin: (entry: PinnedEntry) => void;
    unpinAll: () => void;
};

export function usePinnedEntries(): { pinnedEntries: PinnedEntry[] } & PinMethods {
    const [entries, setEntries] = useCachedState<PinnedEntry[]>("pinned", []);
    return {
        pinnedEntries: entries,
        pin: (entry: PinnedEntry) =>
            setEntries((previousEntries) => [entry, ...previousEntries.filter((e) => !isDeepStrictEqual(e, entry))]),
        unpin: (entry: PinnedEntry) =>
            setEntries((previousEntries) => previousEntries.filter((e) => !isDeepStrictEqual(e, entry))),
        unpinAll: () => setEntries([]),
        moveUp: (entry: PinnedEntry) =>
            setEntries((previousEntries) => {
                const i = previousEntries.findIndex((e) => isDeepStrictEqual(e, entry));
                if (i === 0) {
                    return previousEntries;
                }
                previousEntries.splice(i - 1, 2, previousEntries[i], previousEntries[i - 1]);
                return previousEntries;
            }),
        moveDown: (entry: PinnedEntry) =>
            setEntries((previousEntries) => {
                const i = previousEntries.findIndex((e) => isDeepStrictEqual(e, entry));
                if (i === previousEntries.length - 1) {
                    return previousEntries;
                }
                previousEntries.splice(i, 2, previousEntries[i + 1], previousEntries[i]);
                return previousEntries;
            }),
    };
}
