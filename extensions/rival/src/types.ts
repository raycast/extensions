// --------------------------------------------------------------------------
// Rival Raycast Extension - Shared Types
// --------------------------------------------------------------------------

/** A single model from the Rival Lens API. */
export interface LensModel {
  /** Dot-delimited model ID, e.g. "gpt-4.1", "claude-3.7-sonnet" */
  id: string;
  /** Human-readable name, e.g. "GPT-4.1" */
  name: string;
  /** Provider slug, e.g. "openai", "anthropic" */
  provider: string;
  /** Provider brand hex color, or null */
  color: string | null;
  /** Per-1M-token pricing, or null if unpublished */
  pricing: { input: number; output: number } | null;
  /** Context window in tokens, or null */
  ctx: number | null;
  /** Capability tags, e.g. ["Coding", "Reasoning"] */
  bestFor: string[];
  /** Benchmark scores keyed by name, e.g. { "MMLU": "92.3%" } */
  benchmarks: Record<string, string> | null;
  /** Rival Index rank (1 = best), or null if unranked */
  rank: number | null;
  /** Rival Score 0-100, or null */
  score: number | null;
  /** Duel win percentage, or null */
  winRate: number | null;
  /** Total duels participated, or null */
  duels: number | null;
}

/** Top-level response from /api/lens */
export interface LensPayload {
  models: LensModel[];
  totalModels: number;
  rankedModels: number;
  updatedAt: string;
}

/** Cached data envelope stored in LocalStorage */
export interface CachedLensData {
  payload: LensPayload;
  cachedAt: number; // Date.now() when stored
}

// --------------------------------------------------------------------------
// Filter / sort enums used across commands
// --------------------------------------------------------------------------

export type SortKey = "rank" | "price-asc" | "price-desc" | "name" | "context";

export type FilterCategory =
  | "all"
  | "ranked"
  | "free"
  | "affordable"
  | "premium"
  | "large-context";
