/**
 * Search artifact: natural language query, raw mdfind predicate,
 * generated scope/location, scope depth, and TS-derived readable interpretation.
 */
export type FindFilesScopeMode = "direct" | "recursive";

/**
 * Normalize scope depth values at artifact boundaries.
 * Missing or invalid values fall back to recursive for backward compatibility.
 */
export function normalizeFindFilesScopeMode(scopeMode: unknown): FindFilesScopeMode {
  return scopeMode === "direct" ? "direct" : "recursive";
}

export interface FindFilesSearchArtifact {
  naturalQuery: string;
  predicate: string;
  /** Internally maps to `onlyIn` on the native bridge */
  scopePath: string;
  /** Optional for legacy artifacts; normalized to recursive when missing */
  scopeMode?: FindFilesScopeMode;
  /** E.g. "File type: PNG, Location: Downloads" */
  interpretation: string;
  createdAt: number;
  updatedAt: number;
}

export interface ArtifactHistoryEntry {
  timestamp: number;
  artifact: FindFilesSearchArtifact;
}

/** @deprecated Use ArtifactHistoryEntry instead */
export interface QueryHistoryEntry {
  query: string;
  timestamp: number;
  onlyIn?: string;
}

/**
 * Storage-layer history entry type. Union of all possible shapes that may
 * exist in persisted cache: current artifact entries, legacy query entries,
 * and bare strings from earliest versions.
 */
export type RawHistoryEntry = ArtifactHistoryEntry | QueryHistoryEntry | string;
