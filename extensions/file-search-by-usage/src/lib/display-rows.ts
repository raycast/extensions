import { LIVE_RENDERED_RESULTS } from "./search-limits";

/** Preserve ranking and selection without exceeding the native row budget. */
export function displayRows<T extends { entry: { path: string } }>(
  rows: readonly T[],
  selectedPath?: string,
): T[] {
  const visible = rows.slice(0, LIVE_RENDERED_RESULTS);
  const selectedIndex = selectedPath
    ? rows.findIndex(({ entry }) => entry.path === selectedPath)
    : -1;
  if (selectedIndex >= LIVE_RENDERED_RESULTS) {
    visible.pop();
    visible.push(rows[selectedIndex]);
  }
  return visible;
}
