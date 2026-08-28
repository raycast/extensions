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

/**
 * Total count for a period, summed across invocations. Undefined if unreported.
 *
 * The bucket is untyped JSON at runtime — useFetch does no schema validation —
 * so values are filtered to finite numbers before summing. A plain `+` over
 * `{"asc": "1"}` concatenates to the string "01" and renders as a statistic.
 */
export function totalForPeriod(counts: AnalyticsCounts | undefined, period: AnalyticsPeriod): number | undefined {
  const bucket = counts?.[period];
  if (!bucket) {
    return undefined;
  }
  const values = Object.values(bucket).filter(
    (count): count is number => typeof count === "number" && Number.isFinite(count),
  );
  return values.length === 0 ? undefined : values.reduce((sum, count) => sum + count, 0);
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

/** Package name -> installs over POPULARITY_PERIOD. */
/** One row of the statistics block, ready for either metadata namespace. */
export interface AnalyticsRow {
  key: string;
  title: string;
  text: string;
  /**
   * The value could not be fetched, as opposed to being absent or still
   * loading. Carried as a flag rather than an icon so this module stays
   * import-free — each metadata namespace attaches its own.
   */
  unavailable?: boolean;
}

// "365 Days" rather than "1 Year": the API's bucket is a trailing 365-day
// window, which "last year" reads as either the previous calendar year or the
// year to date.
const analyticsPeriodTitles: [AnalyticsPeriod, string][] = [
  ["30d", "Installs (30 Days)"],
  ["90d", "Installs (90 Days)"],
  ["365d", "Installs (365 Days)"],
];

/**
 * Rows for the statistics block.
 *
 * The three install rows are ALWAYS returned — carrying an em dash when the
 * count isn't known yet — so the metadata panel reserves their height and does
 * not reflow when the lazily-fetched analytics arrive underneath the user.
 *
 * This stabilises the COMMON case only, deliberately. Two rows are still added
 * after the fetch: build errors (absent for almost every package, and a
 * permanent "0" row would be noise) and the deprecation warning, which is rarer
 * still and cannot be usefully reserved — a blank warning slot on every healthy
 * package is a worse trade than a rare shift.
 */
export function analyticsRows(detail?: PackageDetailResponse, failed = false): AnalyticsRow[] {
  const installs = detail?.analytics?.install;

  const rows: AnalyticsRow[] = analyticsPeriodTitles.map(([period, title]) => {
    const total = totalForPeriod(installs, period);
    // An em dash covers both "still loading" and "this package reports none",
    // which are indistinguishable to the user and equally uninteresting. A
    // FAILED fetch is different — saying nothing there implies the package has
    // no installs, so it says so.
    if (total != undefined) {
      return { key: period, title, text: total.toLocaleString() };
    }
    return { key: period, title, text: failed ? "Unavailable" : "—", unavailable: failed };
  });

  const buildErrors = totalForPeriod(detail?.analytics?.build_error, "30d");
  if (buildErrors != undefined && buildErrors > 0) {
    rows.push({ key: "build_error", title: "Build Errors (30 Days)", text: buildErrors.toLocaleString() });
  }

  return rows;
}

/** Package name -> installs over POPULARITY_PERIOD, per category. */
export interface PopularityRanks {
  formulae: Map<string, number>;
  casks: Map<string, number>;
}

/** One item of a bulk analytics file. `count` is comma-formatted, e.g. "1,476,807". */
export interface RankedItem {
  formula?: string;
  cask?: string;
  count: string;
}

export interface RankedResponse {
  items?: RankedItem[];
}

/**
 * Build a name -> installs map from a bulk analytics file.
 *
 * The file also carries a `number` rank, but it is just the ordering by count,
 * so it is not stored — sorting on the count reproduces it.
 *
 * Rows whose count doesn't parse are dropped rather than allowed to poison the
 * sort with NaN, which compares false against everything and would scatter
 * those packages arbitrarily.
 */
export function parseRanks(response: RankedResponse): Map<string, number> {
  const ranks = new Map<string, number>();

  for (const item of response.items ?? []) {
    const id = item.formula ?? item.cask;
    const installs = Number(String(item.count).replace(/,/g, ""));
    if (id && Number.isFinite(installs)) {
      ranks.set(id, installs);
    }
  }

  return ranks;
}

/**
 * Order by install count, most installed first.
 *
 * A package with no analytics row (too new, or below the reporting threshold)
 * sorts last rather than first — treated as -1, not as an absent value that
 * would compare false against everything. Ties fall back to name so the order
 * stays stable between searches.
 */
export function byPopularity<T extends { id: string }>(ranks: Map<string, number>) {
  return (a: T, b: T): number => {
    const installsA = ranks.get(a.id) ?? -1;
    const installsB = ranks.get(b.id) ?? -1;
    return installsA === installsB ? a.id.localeCompare(b.id) : installsB - installsA;
  };
}
