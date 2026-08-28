/**
 * Pure parsing/formatting for Homebrew analytics.
 *
 * Deliberately free of imports so it can be exercised directly — see
 * analyticsParse.check.ts. The I/O half lives in ./analytics.ts.
 */

export type AnalyticsPeriod = "30d" | "90d" | "365d";

/**
 * A period-keyed bucket of counts. The API breaks counts down by *invocation*,
 * not just package name — a formula reports `{"asc": 2752, "asc --HEAD": 6}` —
 * so a total is the sum of the bucket's values.
 */
export type AnalyticsCounts = Partial<Record<AnalyticsPeriod, Record<string, number>>>;

export interface PackageAnalytics {
  install?: AnalyticsCounts;
  install_on_request?: AnalyticsCounts;
  build_error?: AnalyticsCounts;
}

/**
 * The slice of the per-package API JSON this extension reads.
 *
 * Deprecation lives here rather than on the cached Formula/Cask because the
 * bulk index strips those keys (see `valid_keys` in ../cache.ts) — but this
 * endpoint is already fetched for the selected row, so the warning is free.
 */
export interface PackageDetailResponse {
  analytics?: PackageAnalytics;
  deprecated?: boolean;
  deprecation_reason?: string | null;
  deprecation_date?: string | null;
  deprecation_replacement_formula?: string | null;
  deprecation_replacement_cask?: string | null;
  disabled?: boolean;
  disable_reason?: string | null;
  disable_date?: string | null;
  disable_replacement_formula?: string | null;
  disable_replacement_cask?: string | null;
}

/**
 * The single most important thing to say about a package's lifecycle, or
 * undefined when it is in good standing.
 *
 * Disabled outranks deprecated: a disabled formula reports BOTH flags (verified
 * on `ansible@9`), and "disabled" is the one that means it will not install.
 */
export function packageStatus(detail: PackageDetailResponse | undefined): { title: string; text: string } | undefined {
  if (!detail) {
    return undefined;
  }

  const describe = (reason?: string | null, date?: string | null, replacement?: string | null) => {
    const parts = [
      reason ?? undefined,
      date ? `since ${date}` : undefined,
      replacement ? `use ${replacement}` : undefined,
    ];
    return parts.filter(Boolean).join(" · ");
  };

  if (detail.disabled) {
    const text = describe(
      detail.disable_reason,
      detail.disable_date,
      detail.disable_replacement_formula ?? detail.disable_replacement_cask,
    );
    return { title: "Disabled", text: text || "This package can no longer be installed" };
  }

  if (detail.deprecated) {
    const text = describe(
      detail.deprecation_reason,
      detail.deprecation_date,
      detail.deprecation_replacement_formula ?? detail.deprecation_replacement_cask,
    );
    return { title: "Deprecated", text: text || "No longer maintained" };
  }

  return undefined;
}

/** Total count for a period, summed across invocations. Undefined if unreported. */
export function totalForPeriod(counts: AnalyticsCounts | undefined, period: AnalyticsPeriod): number | undefined {
  const bucket = counts?.[period];
  if (!bucket) {
    return undefined;
  }
  return Object.values(bucket).reduce((sum, count) => sum + count, 0);
}

/**
 * The period the popularity sort ranks by, and the count shown per row.
 *
 * 30 days deliberately: it is the window the list accessory reports, and one
 * period means one pair of files to download rather than two.
 */
export const POPULARITY_PERIOD: AnalyticsPeriod = "30d";

/** Cache filenames for the bulk rankings. Imported by cache.ts so Clear Cache
 * removes exactly the files fetchPopularityRanks writes — one definition, not two. */
export const analyticsCacheFiles = [
  `analytics-install-${POPULARITY_PERIOD}.json`,
  `analytics-cask-install-${POPULARITY_PERIOD}.json`,
  // Written by an earlier build that ranked on 90 days. Nothing reads them
  // now, so Clear Cache is the only thing that will ever remove them.
  "analytics-install-90d.json",
  "analytics-cask-install-90d.json",
];

export interface PopularityEntry {
  /** 1 = most installed in its category. */
  rank: number;
  /** Installs over the ranking period. */
  installs: number;
}

export interface PopularityRanks {
  formulae: Map<string, PopularityEntry>;
  casks: Map<string, PopularityEntry>;
}

/** One item of a bulk analytics file. `count` is comma-formatted, e.g. "1,476,807". */
export interface RankedItem {
  number: number;
  formula?: string;
  cask?: string;
  count: string;
}

export interface RankedResponse {
  items?: RankedItem[];
}

/**
 * Build a name -> {rank, installs} map from a bulk analytics file.
 *
 * Rows whose count doesn't parse are dropped rather than allowed to poison the
 * sort with NaN, which compares false against everything and would scatter
 * those packages arbitrarily.
 */
export function parseRanks(response: RankedResponse): Map<string, PopularityEntry> {
  const ranks = new Map<string, PopularityEntry>();

  for (const item of response.items ?? []) {
    const id = item.formula ?? item.cask;
    const installs = Number(String(item.count).replace(/,/g, ""));
    if (id && Number.isFinite(installs)) {
      ranks.set(id, { rank: item.number, installs });
    }
  }

  return ranks;
}

/**
 * Order by install count, most installed first.
 *
 * A package with no analytics row (too new, or below the reporting threshold)
 * sorts last rather than first — `Infinity` rank, not a missing/zero one.
 * Ties fall back to name so the order stays stable between searches.
 */
export function byPopularity<T extends { id: string }>(ranks: Map<string, PopularityEntry>) {
  return (a: T, b: T): number => {
    const rankA = ranks.get(a.id)?.rank ?? Infinity;
    const rankB = ranks.get(b.id)?.rank ?? Infinity;
    return rankA === rankB ? a.id.localeCompare(b.id) : rankA - rankB;
  };
}
