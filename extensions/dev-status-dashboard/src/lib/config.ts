import { CATALOG } from "./catalog";
import type { ServiceState } from "./load";
import { hasProblem, severityRank } from "./status-format";

export type SortMode = "custom" | "name" | "status" | "incident";
export type FilterMode = "all" | "incidents" | "favorites";

export interface DashboardConfig {
  /** Enabled service ids, in display order (used by the "custom" sort). */
  enabledIds: string[];
  favorites: string[];
  sort: SortMode;
  filter: FilterMode;
}

/** LocalStorage key used with `useLocalStorage` in the commands. */
export const CONFIG_KEY = "dev-status.config";

/** First-run defaults: every catalog service enabled so the dashboard is useful immediately. */
export function defaultConfig(): DashboardConfig {
  return { enabledIds: CATALOG.map((service) => service.id), favorites: [], sort: "custom", filter: "all" };
}

/** Fills missing fields and drops ids no longer in the catalog, so stored configs survive upgrades. */
export function normalizeConfig(stored: Partial<DashboardConfig> | undefined): DashboardConfig {
  const base = defaultConfig();
  if (!stored) return base;
  const known = new Set(CATALOG.map((service) => service.id));
  // A missing `enabledIds` means "never configured" → seed everything. An explicit empty array
  // means the user removed every service, so keep it empty (don't resurrect the full catalog).
  const enabledIds = stored.enabledIds ? stored.enabledIds.filter((id) => known.has(id)) : base.enabledIds;
  return {
    enabledIds,
    favorites: (stored.favorites ?? []).filter((id) => known.has(id)),
    sort: stored.sort ?? base.sort,
    filter: stored.filter ?? base.filter,
  };
}

function isFavorite(config: DashboardConfig, id: string): boolean {
  return config.favorites.includes(id);
}

/** Enabled services, in the order the user arranged them. */
export function enabledStates(all: ServiceState[], config: DashboardConfig): ServiceState[] {
  const byId = new Map(all.map((state) => [state.service.id, state]));
  return config.enabledIds.map((id) => byId.get(id)).filter((state): state is ServiceState => state !== undefined);
}

export function sortStates(states: ServiceState[], config: DashboardConfig): ServiceState[] {
  const withFavoritesFirst = (a: ServiceState, b: ServiceState) =>
    Number(isFavorite(config, b.service.id)) - Number(isFavorite(config, a.service.id));

  const sorted = [...states];
  switch (config.sort) {
    case "custom":
      // enabledStates already applied the custom order; only float favorites up.
      return sorted.sort(withFavoritesFirst);
    case "name":
      return sorted.sort((a, b) => withFavoritesFirst(a, b) || a.service.name.localeCompare(b.service.name));
    case "status":
      return sorted.sort(
        (a, b) =>
          withFavoritesFirst(a, b) ||
          severityRank(b.status?.indicator ?? "unknown") - severityRank(a.status?.indicator ?? "unknown") ||
          a.service.name.localeCompare(b.service.name),
      );
    case "incident":
      return sorted.sort(
        (a, b) =>
          withFavoritesFirst(a, b) ||
          (b.status?.activeIncidents.length ?? 0) - (a.status?.activeIncidents.length ?? 0) ||
          a.service.name.localeCompare(b.service.name),
      );
  }
}

export function filterStates(states: ServiceState[], config: DashboardConfig): ServiceState[] {
  switch (config.filter) {
    case "incidents":
      return states.filter((state) => state.status && hasProblem(state.status.indicator));
    case "favorites":
      return states.filter((state) => isFavorite(config, state.service.id));
    default:
      return states;
  }
}

// --- Pure config mutations (return a new config; callers persist the result) ---

export function toggleFavorite(config: DashboardConfig, id: string): DashboardConfig {
  const favorites = isFavorite(config, id)
    ? config.favorites.filter((favorite) => favorite !== id)
    : [...config.favorites, id];
  return { ...config, favorites };
}

export function removeService(config: DashboardConfig, id: string): DashboardConfig {
  return {
    ...config,
    enabledIds: config.enabledIds.filter((enabled) => enabled !== id),
    favorites: config.favorites.filter((favorite) => favorite !== id),
  };
}

export function addService(config: DashboardConfig, id: string): DashboardConfig {
  if (config.enabledIds.includes(id)) return config;
  return { ...config, enabledIds: [...config.enabledIds, id] };
}

export function moveService(config: DashboardConfig, id: string, direction: -1 | 1): DashboardConfig {
  const index = config.enabledIds.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= config.enabledIds.length) return config;
  const enabledIds = [...config.enabledIds];
  [enabledIds[index], enabledIds[target]] = [enabledIds[target], enabledIds[index]];
  return { ...config, enabledIds };
}
