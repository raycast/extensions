import {
  savedResultPrimaryText,
  type SavedResult,
} from "./saved-results-model";

export interface PinnedExpression {
  id: string;
  /** Expression text shown as the menu label and copied on demand. */
  primary: string;
  /** Original intent, carried for the Save to Floating Note action. */
  source?: string;
  /** Coaching note, carried for the Save to Floating Note action. */
  coaching?: string;
}

const DEFAULT_LIMIT = 10;

/**
 * Project saved results into the view model the menu-bar command renders:
 * the most recent entries, each reduced to its expression plus the context the
 * floating-note action needs.
 */
export function buildPinnedItems(
  items: SavedResult[],
  limit = DEFAULT_LIMIT,
): PinnedExpression[] {
  return items.slice(0, limit).map((item) => ({
    id: item.id,
    primary: savedResultPrimaryText(item),
    source: item.sourceText,
    coaching: item.coaching,
  }));
}
