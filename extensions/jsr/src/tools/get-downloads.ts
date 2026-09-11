import type { DownloadsResponse } from "@/types";

import { fetchJsrJson } from "@/lib/jsrFetch";
import { jsrUrls } from "@/lib/jsrUrls";

type Input = {
  /** Scope without the leading "@". */
  scope: string;
  /** Package name. */
  name: string;
};

type DownloadSummary = {
  /** Total downloads across all kinds over the last ~90 days. */
  totalLast90Days: number;
  /** Total grouped by download kind (e.g. "jsr_meta", "npm_tarball"). */
  byKind: Record<string, number>;
  /** Per-recent-version download totals (jsr.io tracks up to ~5 most recent versions). */
  recentVersions: { version: string; downloads: number }[];
};

/**
 * Fetch ~90-day download stats for a JSR package: total, per-kind breakdown,
 * and per-recent-version totals.
 */
export default async function tool(input: Input): Promise<DownloadSummary> {
  const data = await fetchJsrJson<DownloadsResponse>(jsrUrls.api.downloads(input.scope, input.name));
  const totalLast90Days = data.total.reduce((s, d) => s + d.count, 0);
  const byKind = data.total.reduce<Record<string, number>>((acc, d) => {
    acc[d.kind] = (acc[d.kind] ?? 0) + d.count;
    return acc;
  }, {});
  const recentVersions = data.recentVersions.map((rv) => ({
    version: rv.version,
    downloads: rv.downloads.reduce((s, d) => s + d.count, 0),
  }));
  return { totalLast90Days, byKind, recentVersions };
}
