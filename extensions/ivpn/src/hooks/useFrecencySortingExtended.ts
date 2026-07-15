import { useFrecencySorting } from "@raycast/utils";
import { useMemo, useReducer } from "react";

type Return<T> = {
  data: T[];
  visitItem: (item: T) => Promise<void>;
  resetRanking: (item: T) => Promise<void>;
  // extended:
  compare: (a: T, b: T) => number; // reverse-engineered compare function
  resetRankingSignal: number; // emits whenever ranking gets reset
};

// overload w/ id
export function useFrecencySortingExtended<T extends { id: string }>(
  data?: T[],
  options?: {
    namespace?: string;
    key?: (item: T) => string;
    sortUnvisited?: (a: T, b: T) => number;
  },
): Return<T>;
// overload w/o id
export function useFrecencySortingExtended<T>(
  data: T[] | undefined,
  options: {
    namespace?: string;
    key: (item: T) => string;
    sortUnvisited?: (a: T, b: T) => number;
  },
): Return<T>;

export function useFrecencySortingExtended<T extends { id?: string }>(
  data?: T[],
  options?: {
    namespace?: string;
    key?: (item: T) => string;
    sortUnvisited?: (a: T, b: T) => number;
  },
): Return<T> {
  const {
    data: sortedData,
    visitItem: _visitItem,
    resetRanking: _resetRanking,
  } = useFrecencySorting<T>(data, options as any);

  const key = (item: T) => {
    if (options?.key) return options.key(item);
    if (!("id" in item)) throw new Error(`property "id" expected in item`);
    return String(item.id);
  };

  const [visitItemSignal, triggerVisitItemSignal] = useReducer((cur) => cur + 1, 0);
  const visitItem = async (item: T) => {
    await _visitItem(item);
    triggerVisitItemSignal();
  };

  const [resetRankingSignal, triggerResetRankingSignal] = useReducer((cur) => cur + 1, 0);
  const resetRanking = async (item: T) => {
    await _resetRanking(item);
    triggerResetRankingSignal();
  };

  const indexMap = useMemo(
    () => new Map(sortedData.map((item, idx) => [key(item), idx])),
    [visitItemSignal, resetRankingSignal],
  );
  const compare = (a: T, b: T) => {
    const aIdx = indexMap.get(key(a)) ?? Number.POSITIVE_INFINITY;
    const bIdx = indexMap.get(key(b)) ?? Number.POSITIVE_INFINITY;
    return aIdx - bIdx;
  };

  return {
    data: sortedData,
    visitItem,
    resetRanking,
    resetRankingSignal,
    compare,
  };
}
