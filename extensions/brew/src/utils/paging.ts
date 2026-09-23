/**
 * A sliding WINDOW over search results, not an accumulating list.
 *
 * Raycast caps a command at 100MB and refuses to page near the ceiling — see
 * `AGENTS.md`, "Why Search does not paginate". Native `List` pagination is
 * append-only, so page 4 held 400 records plus the retained previous page, and
 * the command died at ~71MB after three steps.
 *
 * A window of fixed size does not grow: page 40 holds exactly the same number
 * of records as page 1, because the previous page is dropped rather than kept.
 * That is what makes browsing all 7,716 casks possible at all.
 */

/** Rows per page, per category. */
export const PAGE_SIZE = 100;

/** How many pages the given number of matches spans. At least one, always. */
export function pageCount(total: number | undefined, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil((total ?? 0) / pageSize));
}

/**
 * Clamp a page index into range.
 *
 * Pages are addressed while the totals for a DIFFERENT query may still be on
 * screen, so an out-of-range index is a normal transient rather than a bug.
 */
export function clampPage(page: number, total: number | undefined, pageSize: number = PAGE_SIZE): number {
  const last = pageCount(total, pageSize) - 1;
  return Math.min(Math.max(page, 0), last);
}

/**
 * "101–200 of 7,716 casks" — which slice of the matches is on screen.
 *
 * An en dash for the range, thousands separators because these run to five
 * digits, and a singular noun when only one matched so it never reads
 * "1–1 of 1 casks".
 */
export function pageRangeSummary(offset: number, shown: number, total: number, kind: "formula" | "cask"): string {
  const noun = total === 1 ? kind : kind === "formula" ? "formulae" : "casks";
  return `${pageRangeCompact(offset, shown, total)} ${noun}`;
}

/** The same fact in the space a narrow list column actually has. */
export function pageRangeCompact(offset: number, shown: number, total: number): string {
  const first = offset + 1;
  const last = offset + shown;
  const range = shown <= 1 ? `${first.toLocaleString()}` : `${first.toLocaleString()}–${last.toLocaleString()}`;
  return `${range} of ${total.toLocaleString()}`;
}

/**
 * How many matches the window spans, given which categories are on screen.
 *
 * The maximum rather than the sum: the two categories are paged in LOCKSTEP by
 * a single offset, so the number of pages is however many the longer one needs.
 * A hidden category contributes nothing — otherwise hiding formulae would still
 * offer the pages only formulae could have filled, and landing on one shows an
 * empty list.
 */
export function visibleTotal(
  totals: { formulae: number; casks: number } | undefined,
  visible: { formulae: boolean; casks: boolean },
): number {
  if (!totals) {
    return 0;
  }
  return Math.max(visible.formulae ? totals.formulae : 0, visible.casks ? totals.casks : 0);
}

/**
 * Whether a page after this one exists.
 *
 * The footer row in `src/components/list.tsx` makes "Next Page" its primary
 * action, so it must not render on the final partial page — there, `total`
 * still exceeds the rows shown, but `PagingSection` offers no Next action and
 * ⏎ lands on Previous Page instead. Both share this predicate so the row and
 * the panel cannot disagree about it.
 */
export function hasNextPage(page: number, totalPages: number): boolean {
  return page < totalPages - 1;
}
