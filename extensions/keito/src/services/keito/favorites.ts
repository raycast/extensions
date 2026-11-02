import { scopedKey } from "./session";
import { Project } from "./types";
import { parseDuration } from "../parseDuration";

export interface Favorite {
  id: string;
  projectId: string;
  projectName: string;
  projectCode?: string;
  taskId: string;
  taskName: string;
  clientId?: string;
  clientName?: string;
  notes?: string;
  /** Decimal hours as a string. Blank means "start a timer". */
  hours?: string;
}

export function favoritesKey(scope: string): string {
  return scopedKey(scope, "favorites");
}

export function favoritesFrecencyNamespace(scope: string): string {
  return scopedKey(scope, "favorites-frecency");
}

/** Parse stored favorites, dropping anything malformed and coercing legacy numeric IDs to strings. */
export function parseFavorites(raw: string | undefined): Favorite[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const favorites: Favorite[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    const id = f.id ?? undefined;
    const projectId = f.projectId ?? undefined;
    const taskId = f.taskId ?? undefined;
    if (id === undefined || projectId === undefined || taskId === undefined) continue;
    favorites.push({
      id: String(id),
      projectId: String(projectId),
      projectName: typeof f.projectName === "string" ? f.projectName : "Unknown project",
      projectCode: typeof f.projectCode === "string" ? f.projectCode : undefined,
      taskId: String(taskId),
      taskName: typeof f.taskName === "string" ? f.taskName : "Unknown task",
      clientId: f.clientId !== undefined && f.clientId !== null ? String(f.clientId) : undefined,
      clientName: typeof f.clientName === "string" ? f.clientName : undefined,
      notes: typeof f.notes === "string" && f.notes ? f.notes : undefined,
      hours: typeof f.hours === "string" && f.hours ? f.hours : undefined,
    });
  }
  return favorites;
}

export function upsertFavorite(favorites: Favorite[], favorite: Favorite): { favorites: Favorite[]; added: boolean } {
  const index = favorites.findIndex((f) => f.id === favorite.id);
  if (index < 0) return { favorites: [...favorites, favorite], added: true };
  const next = [...favorites];
  next[index] = favorite;
  return { favorites: next, added: false };
}

/** Normalize a duration input to decimal hours for storage. Returns null when invalid. */
export function normalizeFavoriteHours(input: string): string | undefined | null {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const parsed = parseDuration(trimmed);
  if (!parsed || parsed.asMinutes() <= 0) return null;
  return String(Math.round((parsed.asMinutes() / 60) * 10000) / 10000);
}

/**
 * A favorite is only usable when its project is still active and visible. Task assignment is
 * validated by Keito when the entry is created.
 */
export function favoriteAvailability(
  favorite: Favorite,
  projects: Project[] | undefined,
): { available: boolean; reason?: string } {
  if (!projects) return { available: true };
  if (!projects.some((p) => p.id === favorite.projectId)) {
    return { available: false, reason: "The project is archived or you are no longer assigned to it." };
  }
  return { available: true };
}
