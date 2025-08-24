import { useMemo } from "react";
import { PaperRawData } from "../types";

export function useGetCategories(dependency: PaperRawData | null): Array<string> {
  return useMemo(() => {
    if (!dependency) return [];
    return Object.keys(dependency).map((key) => key.charAt(0).toUpperCase() + key.slice(1));
  }, [dependency]);
}
