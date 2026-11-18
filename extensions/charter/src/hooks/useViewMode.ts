import { useCachedState } from "@raycast/utils";

export type ViewMode = "grid" | "list";

export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 6;
const DEFAULT_COLUMNS = 4;

/** View choices live in cached state so they survive between launches. */
export function useViewMode() {
  const [viewMode, setViewMode] = useCachedState<ViewMode>("charter-view-mode", "grid");
  const [showDetail, setShowDetail] = useCachedState<boolean>("charter-list-detail", true);
  const [columns, setColumnsRaw] = useCachedState<number>("charter-grid-columns", DEFAULT_COLUMNS);

  function setColumns(next: number) {
    setColumnsRaw(Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, next)));
  }

  return { viewMode, setViewMode, showDetail, setShowDetail, columns, setColumns };
}
