import type { LayoutEntry, Workspace } from "./schema";
import { clampRecentDisplayCount } from "./settings";

const BROWSE_SHORTCUT_BASE_SCORE = 5000;
const BROWSE_MAX_RECENCY_BONUS = 40;
const BROWSE_PINNED_MINIMUM_BONUS = BROWSE_MAX_RECENCY_BONUS + 1;
const BROWSE_UNORDERED_PIN_ORDER = 100;

export function computeBrowseScore(workspace: Workspace, utcNow = new Date()): number {
  let score = BROWSE_SHORTCUT_BASE_SCORE;
  if (workspace.isPinned) {
    const pinOrder = workspace.pinOrder ?? BROWSE_UNORDERED_PIN_ORDER;
    score += Math.max(BROWSE_PINNED_MINIMUM_BONUS, 50 + (100 - Math.min(pinOrder, 99)));
  } else {
    score += recencyBonus(workspace, utcNow);
  }
  return score;
}

export function computeSearchScore(workspace: Workspace, query: string, utcNow = new Date()): number {
  let score = workspace.isPinned ? 100 : 0;
  score += abbreviationBonus(workspace, query);
  score += recencyBonus(workspace, utcNow);
  return score;
}

function abbreviationBonus(workspace: Workspace, query: string): number {
  const search = query.trim();
  if (!search || !workspace.abbreviation) {
    return 0;
  }
  if (workspace.abbreviation.toLowerCase() === search.toLowerCase()) {
    return 200;
  }
  if (workspace.abbreviation.toLowerCase().startsWith(search.toLowerCase())) {
    return 120;
  }
  return 0;
}

function recencyBonus(workspace: Workspace, utcNow: Date): number {
  if (!workspace.lastUsedUtc) {
    return 0;
  }
  const lastUsed = new Date(workspace.lastUsedUtc);
  if (Number.isNaN(lastUsed.getTime())) {
    return 0;
  }
  const ageHours = Math.max(0, (utcNow.getTime() - lastUsed.getTime()) / (1000 * 60 * 60));
  return Math.round(Math.max(0, 40 - ageHours));
}

export function getFavoriteWorkspaces(workspaces: Workspace[]): Workspace[] {
  return workspaces
    .filter((workspace) => workspace.isPinned)
    .sort((left, right) => {
      const leftOrder = left.pinOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.pinOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.name.localeCompare(right.name, undefined, {
        sensitivity: "base",
      });
    });
}

export function getRecentWorkspaces(workspaces: Workspace[], recentWorkspaceCount: number): Workspace[] {
  const limit = clampRecentDisplayCount(recentWorkspaceCount);
  if (limit === 0) {
    return [];
  }

  return workspaces
    .filter((workspace) => workspace.lastUsedUtc && !workspace.isPinned)
    .sort((left, right) => {
      const leftTime = new Date(left.lastUsedUtc ?? 0).getTime();
      const rightTime = new Date(right.lastUsedUtc ?? 0).getTime();
      return rightTime - leftTime;
    })
    .slice(0, limit);
}

/** Most recently used workspaces (includes favorites), for root/action shortcuts. */
export function getMostRecentlyUsedWorkspaces(workspaces: Workspace[], limit: number): Workspace[] {
  if (limit <= 0 || workspaces.length === 0) {
    return [];
  }

  return [...workspaces]
    .sort((left, right) => {
      const leftTime = left.lastUsedUtc ? new Date(left.lastUsedUtc).getTime() : 0;
      const rightTime = right.lastUsedUtc ? new Date(right.lastUsedUtc).getTime() : 0;
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    })
    .slice(0, limit);
}

export function sortWorkspacesForBrowse(workspaces: Workspace[], utcNow = new Date()): Workspace[] {
  return [...workspaces].sort((left, right) => {
    const scoreDelta = computeBrowseScore(right, utcNow) - computeBrowseScore(left, utcNow);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
    });
  });
}

export function sortWorkspacesForSearch(workspaces: Workspace[], query: string, utcNow = new Date()): Workspace[] {
  return [...workspaces].sort((left, right) => {
    const scoreDelta = computeSearchScore(right, query, utcNow) - computeSearchScore(left, query, utcNow);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
    });
  });
}

export type BrowseLayoutSection = {
  title: string;
  separator?: { id: string; title?: string | null };
  workspaces: Workspace[];
};

export type RankedWorkspaceSections = {
  favorites: Workspace[];
  recents: Workspace[];
  workspaces: Workspace[];
  /** Separator-driven browse sections for the Workspaces area (ignored in search). */
  layoutSections: BrowseLayoutSection[];
};

export function buildBrowseSections(
  workspaces: Workspace[],
  recentWorkspaceCount: number,
  layoutEntries?: LayoutEntry[],
): RankedWorkspaceSections {
  const favorites = getFavoriteWorkspaces(workspaces);
  const favoriteIds = new Set(favorites.map((workspace) => workspace.id));
  const recents = getRecentWorkspaces(workspaces, recentWorkspaceCount);
  const recentIds = new Set(recents.map((workspace) => workspace.id));

  const remaining = sortWorkspacesForBrowse(
    workspaces.filter((workspace) => !favoriteIds.has(workspace.id) && !recentIds.has(workspace.id)),
  );

  return {
    favorites,
    recents,
    workspaces: remaining,
    layoutSections: buildLayoutSections(remaining, layoutEntries),
  };
}

/** Group remaining browse workspaces by layout separators. Search mode should ignore this. */
export function buildLayoutSections(remaining: Workspace[], layoutEntries?: LayoutEntry[]): BrowseLayoutSection[] {
  const entries = layoutEntries ?? [];
  const hasSeparators = entries.some((entry) => entry.type === "separator");
  if (remaining.length === 0 && !hasSeparators) {
    return [];
  }

  const byId = new Map(remaining.map((workspace) => [workspace.id, workspace]));
  const used = new Set<string>();
  const sections: BrowseLayoutSection[] = [];
  let current: BrowseLayoutSection | null = null;

  function ensureSection(): BrowseLayoutSection {
    if (!current) {
      current = { title: "Workspaces", workspaces: [] };
      sections.push(current);
    }
    return current;
  }

  function addWorkspace(workspace: Workspace): void {
    if (used.has(workspace.id)) {
      return;
    }
    ensureSection().workspaces.push(workspace);
    used.add(workspace.id);
  }

  for (const entry of entries) {
    if (entry.type === "separator") {
      current = {
        title: entry.title?.trim() || "Workspaces",
        separator: { id: entry.id, title: entry.title ?? null },
        workspaces: [],
      };
      sections.push(current);
      continue;
    }

    const workspace = byId.get(entry.workspaceId);
    if (workspace) {
      addWorkspace(workspace);
    }
  }

  for (const workspace of remaining) {
    addWorkspace(workspace);
  }

  return sections.filter((section) => section.workspaces.length > 0 || section.separator);
}

export function buildSearchResults(workspaces: Workspace[], query: string, utcNow = new Date()): Workspace[] {
  return sortWorkspacesForSearch(workspaces, query, utcNow);
}
