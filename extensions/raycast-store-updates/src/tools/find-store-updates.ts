import { fetchInstalledExtensionSlugs, fetchStoreUpdates } from "../utils";

type Input = {
  /** Match an extension's title or description. Omit to see the latest updates. */
  query?: string;
  /** Choose new extensions, updates to existing extensions, or both. */
  type?: "new" | "updated" | "all";
  /** Show only updates for extensions installed locally. */
  installedOnly?: boolean;
  /** Only include extensions published or updated within the last N days. */
  days?: number;
  /** Include updates on or after this date (YYYY-MM-DD, UTC). */
  since?: string;
  /** Maximum number of results to return, from 1 to 50. Defaults to 20. */
  limit?: number;
};

/** Find the latest Raycast Store extensions and extension updates. */
export default async function findStoreUpdates(input: Input) {
  if (input.days !== undefined && (!Number.isFinite(input.days) || input.days <= 0)) {
    throw new Error("days must be a positive number.");
  }
  let cutoff = input.days === undefined ? null : Date.now() - input.days * 24 * 60 * 60 * 1000;
  if (input.since !== undefined) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(input.since) ? Date.parse(`${input.since}T00:00:00Z`) : NaN;
    if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== input.since) {
      throw new Error("since must be a valid date in YYYY-MM-DD format.");
    }
    cutoff = cutoff === null ? date : Math.max(cutoff, date);
  }
  const { items, updatesUnavailable } = await fetchStoreUpdates(input.type === "new" ? "new" : "all");
  const query = input.query?.trim().toLowerCase();
  const installed = input.installedOnly ? await fetchInstalledExtensionSlugs() : null;
  if (input.installedOnly && !installed) {
    throw new Error("Installed extensions could not be determined.");
  }
  const limit = Math.min(50, Math.max(1, Math.floor(input.limit ?? 20)));

  const matches = items.filter((item) => {
    if (input.installedOnly && item.type !== "updated") return false;
    if (input.type && input.type !== "all" && item.type !== input.type) return false;
    if (installed && (!item.extensionSlug || !installed.has(item.extensionSlug))) return false;
    if (cutoff !== null && !(new Date(item.date).getTime() >= cutoff)) return false;
    return !query || `${item.title} ${item.summary}`.toLowerCase().includes(query);
  });

  return {
    totalMatches: matches.length,
    ...(updatesUnavailable ? { updatesUnavailable } : {}),
    items: matches.slice(0, limit).map((item) => ({
      title: item.title,
      description: item.summary,
      type: item.type,
      date: item.date,
      author: item.authorName,
      url: item.url,
      ...(item.prUrl ? { pullRequestUrl: item.prUrl } : {}),
    })),
  };
}
