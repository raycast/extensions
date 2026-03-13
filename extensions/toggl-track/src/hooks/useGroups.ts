import { useMemo } from "react";

export function useGroups<T, K extends PrimaryKeys<T>>(items: T[], groupBy: K) {
  type GroupKey = T[K] & (string | number);
  return useMemo(() => {
    const groups = {} as Record<GroupKey, T[]>;
    for (const item of items) {
      const key = item[groupBy] as GroupKey;
      if (key in groups) groups[key].push(item);
      else groups[key] = [item];
    }
    return groups;
  }, [items]);
}

type PrimaryKeys<T> = {
  [K in keyof T]: T[K] extends string | number ? K : never;
}[keyof T];
