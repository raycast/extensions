import { RouterOutputs } from "@repo/trpc-router";
import { useMemo } from "react";

export const useSortedSpaces = (spaces?: RouterOutputs["user"]["me"]["associatedSpaces"]) => {
  const sorted = useMemo(() => {
    if (!spaces) return undefined;

    // Sort PERSONAL type to the front. Sort by name otherwise.
    return spaces.sort((a, b) => a.name.localeCompare(b.name)).sort((a) => (a.type === "PERSONAL" ? -1 : 1));
  }, [spaces]);

  return sorted;
};
