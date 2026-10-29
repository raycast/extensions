import type { AppUsage, SortBy } from "../types";
import { combinedRate, QUIET_BYTES_PER_SECOND, sortApps } from "./usage";

export interface ListLayout {
  sort: SortBy;
  order: string[];
  revealed: string[];
}

/** Keep live values separate from row placement so reading a row never becomes a moving target. */
export function updateListLayout(
  previous: ListLayout,
  apps: AppUsage[],
  sort: SortBy,
  selectedId: string | null,
  reorder = false,
): ListLayout {
  const ranked = sortApps(apps, sort);
  const activeIds = ranked.filter((app) => combinedRate(app) >= QUIET_BYTES_PER_SECOND).map((app) => app.id);
  if (apps.some((app) => app.id === selectedId) && selectedId) activeIds.push(selectedId);
  if (reorder || previous.sort !== sort) {
    return { sort, order: ranked.map((app) => app.id), revealed: [...new Set(activeIds)] };
  }
  const knownIds = new Set(previous.order);
  const revealedIds = new Set(previous.revealed);
  const added = ranked.filter((app) => !knownIds.has(app.id)).map((app) => app.id);
  const newlyActive = activeIds.filter((id) => !revealedIds.has(id));
  if (!added.length && !newlyActive.length) return previous;
  return {
    sort,
    order: [...previous.order, ...added],
    revealed: [...new Set([...previous.revealed, ...newlyActive])],
  };
}

export function orderApps(apps: AppUsage[], layout: ListLayout): AppUsage[] {
  const byId = new Map(apps.map((app) => [app.id, app]));
  return layout.order.flatMap((id) => {
    const app = byId.get(id);
    return app ? [app] : [];
  });
}
