/**
 * Batch rename types for Portfolio Tracker.
 *
 * The batch rename UI is rendered inline within EditPositionForm (phase 2).
 * This file exports only the shared type used by both EditPositionForm
 * and portfolio.tsx to describe matching positions for batch rename.
 */

import { Position } from "../utils/types";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

/** A matching position candidate for batch rename */
export interface BatchRenameMatch {
  /** The account ID containing this position */
  accountId: string;
  /** The account name (for display) */
  accountName: string;
  /** The matching position */
  position: Position;
}
