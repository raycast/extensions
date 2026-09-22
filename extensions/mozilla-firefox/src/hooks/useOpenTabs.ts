import { useMemo } from "react";
import { Tab } from "../interfaces";
import { readOpenTabs } from "../util";

export function useOpenTabs(query: string | undefined): Tab[] {
  return useMemo(() => readOpenTabs(query), [query]);
}
