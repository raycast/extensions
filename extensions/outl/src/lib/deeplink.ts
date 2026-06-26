/**
 * Build `outl://` deep links so the commands can open results in the
 * desktop app.
 *
 * The scheme contract is owned by the Rust side
 * (`crates/outl-actions/src/deeplink.rs`); this mirrors it for the
 * outbound (build) direction only:
 *
 *   outl://daily/today        → today's journal
 *   outl://daily/<YYYY-MM-DD> → a specific daily
 *   outl://page/<slug>        → a page (slug may nest with `/`)
 *
 * Registration of the handler is the desktop app's job (issue #98); we
 * only construct the URLs.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `outl://daily/today` — open today's journal. */
export function dailyTodayLink(): string {
  return "outl://daily/today";
}

/** `outl://daily/<YYYY-MM-DD>` for an already-ISO date string. */
export function dailyLink(isoDate: string): string {
  return `outl://daily/${isoDate}`;
}

/** `outl://page/<slug>` — slug segments are passed through verbatim. */
export function pageLink(slug: string): string {
  return `outl://page/${slug}`;
}

/** True when a slug looks like a journal date (`YYYY-MM-DD`). */
export function isJournalSlug(slug: string): boolean {
  return ISO_DATE.test(slug);
}

/**
 * Pick the right deep link for a hit whose page slug we know.
 *
 * A journal hit routes to `outl://daily/<iso>`; everything else to
 * `outl://page/<slug>`. `isJournal` (from the search payload) wins when
 * present; otherwise we fall back to the slug shape.
 */
export function linkForSlug(slug: string, isJournal?: boolean): string {
  const journal = isJournal ?? isJournalSlug(slug);
  return journal ? dailyLink(slug) : pageLink(slug);
}
