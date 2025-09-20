import { RouterOutputs } from "@repo/trpc-router";
import { useMemo } from "react";

export const useSortedSpaces = (spaces?: RouterOutputs["user"]["me"]["associatedSpaces"]) => {
  const sorted = useMemo(() => {
    if (!spaces) return undefined;

    // Sort PERSONAL type to the front. Sort by name otherwise.
    return [...spaces].sort((a, b) => {
      if (a.type === "PERSONAL" && b.type !== "PERSONAL") return -1;
      if (a.type !== "PERSONAL" && b.type === "PERSONAL") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [spaces]);

  return sorted;
};
