import type { MockConfig } from "./types";

/**
 * Named presets. Switch via `npm run dev:mock <name>` or by setting
 * `"scenario"` in `mockConfig.json`. Preset fields are merged on top of the
 * JSON baseline — any field omitted here falls through to the baseline value.
 */
export type Scenario = Partial<MockConfig>;

export const SCENARIOS: Record<string, Scenario> = {
  /** Tiny, all-fast SSD setup. Sanity check that the mock works at all. */
  baseline: {
    diskCount: 6,
    sectionCount: 2,
    latency: {
      fast: { weight: 1, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 0, range: { minMs: 200, maxMs: 800 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0,
  },

  /** Realistic everyday laptop: ~20 disks, mostly fast, occasional slow. */
  mixed_20: {
    diskCount: 20,
    sectionCount: 3,
    latency: {
      fast: { weight: 8, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 2, range: { minMs: 200, maxMs: 800 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0,
  },

  /**
   * 70 disks, no stalls — pure throughput test.
   * Use this to see whether the system can dispatch many fast calls
   * without spurious timeouts due to queueing.
   */
  stress_70: {
    diskCount: 70,
    sectionCount: 5,
    latency: {
      fast: { weight: 9, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 1, range: { minMs: 200, maxMs: 800 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0,
  },

  /**
   * 70 disks with ~10% deliberate stalls > 5s.
   * Reproduces the production bug report: full-timeout under load.
   */
  stress_70_with_timeouts: {
    diskCount: 70,
    sectionCount: 5,
    latency: {
      fast: { weight: 7, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 2, range: { minMs: 200, maxMs: 800 } },
      stall: { weight: 1, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0,
  },

  /** Worst case: many disks, many stalls. Useful for verifying recovery UX. */
  stress_70_catastrophic: {
    diskCount: 70,
    sectionCount: 5,
    latency: {
      fast: { weight: 3, range: { minMs: 50, maxMs: 150 } },
      slow: { weight: 4, range: { minMs: 500, maxMs: 1500 } },
      stall: { weight: 3, range: { minMs: 6000, maxMs: 12000 } },
    },
    errorFraction: 0.05,
  },

  /** External-HDD-heavy: long tail of slow calls but nothing stalls. */
  hdd_heavy: {
    diskCount: 30,
    sectionCount: 3,
    latency: {
      fast: { weight: 2, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 8, range: { minMs: 800, maxMs: 3000 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0,
  },

  /** Random failures, no latency stress. Tests error-path UI. */
  flaky: {
    diskCount: 15,
    sectionCount: 2,
    latency: {
      fast: { weight: 1, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 0, range: { minMs: 200, maxMs: 800 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0.2,
  },

  /** Just one whole disk + one partition. Smallest possible system. */
  single_disk: {
    diskCount: 2,
    sectionCount: 1,
    latency: {
      fast: { weight: 1, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 0, range: { minMs: 200, maxMs: 800 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0,
  },

  /** Many external/removable drives — exercises the "removable" filter + eject UX. */
  external_heavy: {
    diskCount: 25,
    sectionCount: 6,
    latency: {
      fast: { weight: 3, range: { minMs: 30, maxMs: 100 } },
      slow: { weight: 7, range: { minMs: 400, maxMs: 1200 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0,
  },

  /** 150 disks. More extreme than stress_70 to test scaling headroom. */
  huge_150: {
    diskCount: 150,
    sectionCount: 8,
    latency: {
      fast: { weight: 9, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 1, range: { minMs: 200, maxMs: 800 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0,
  },

  /** `diskutil list` itself is slow. Tests the loading-empty-state UI. */
  slow_list: {
    diskCount: 10,
    sectionCount: 2,
    latency: {
      fast: { weight: 1, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 0, range: { minMs: 200, maxMs: 800 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    listLatency: { minMs: 3000, maxMs: 5000 },
    errorFraction: 0,
  },

  /** Every `diskutil info` errors. Tests the "everything broken" UX. */
  errors_only: {
    diskCount: 10,
    sectionCount: 2,
    latency: {
      fast: { weight: 1, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 0, range: { minMs: 200, maxMs: 800 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 1,
  },

  /** Partial outage: combination of stalls + errors. Realistic mid-failure. */
  partial_outage: {
    diskCount: 40,
    sectionCount: 4,
    latency: {
      fast: { weight: 5, range: { minMs: 20, maxMs: 80 } },
      slow: { weight: 3, range: { minMs: 300, maxMs: 1200 } },
      stall: { weight: 2, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0.15,
  },

  /** Typical developer MacBook: internal SSD + 2 externals + a couple containers. */
  realistic_macbook: {
    diskCount: 14,
    sectionCount: 4,
    latency: {
      fast: { weight: 9, range: { minMs: 20, maxMs: 60 } },
      slow: { weight: 1, range: { minMs: 150, maxMs: 400 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0,
  },

  /**
   * 70 disks behind a libuv-sized pool of 4 concurrent `info` calls. This is
   * the scenario that actually reproduces the production failure: individual
   * calls aren't slow, but with 140 of them queueing through 4 slots, the
   * calling code's 5 s timeout fires for many calls that *never even start*.
   *
   * Use this to validate the eventual semaphore/concurrency-cap fix on the
   * caller side: with the fix, the host code feeds the mock at a rate that
   * matches the pool, and timeouts disappear.
   */
  stress_70_libuv: {
    diskCount: 70,
    sectionCount: 5,
    latency: {
      fast: { weight: 9, range: { minMs: 60, maxMs: 200 } },
      slow: { weight: 1, range: { minMs: 400, maxMs: 1000 } },
      stall: { weight: 0, range: { minMs: 6000, maxMs: 9000 } },
    },
    errorFraction: 0,
    pool: 4,
  },
};

/**
 * Stable, numbered list — referenced by `npm run dev:mock <N>` and `MOCK=<N>`
 * env-var shortcuts. Append to the end only. Never re-order existing entries
 * or numeric refs will silently change meaning.
 */
export const SCENARIO_LIST: string[] = [
  "baseline", // 1
  "mixed_20", // 2
  "stress_70", // 3
  "stress_70_with_timeouts", // 4
  "stress_70_catastrophic", // 5
  "hdd_heavy", // 6
  "flaky", // 7
  "single_disk", // 8
  "external_heavy", // 9
  "huge_150", // 10
  "slow_list", // 11
  "errors_only", // 12
  "partial_outage", // 13
  "realistic_macbook", // 14
  "stress_70_libuv", // 15
];

export function listScenarioNames(): string[] {
  return Object.keys(SCENARIOS);
}

/** Resolve "4" or "stress_70_with_timeouts" to a scenario name, or null. */
export function resolveScenarioRef(ref: string): string | null {
  const trimmed = ref.trim();
  if (!trimmed) return null;
  // Numeric: 1-based index into SCENARIO_LIST
  if (/^\d+$/.test(trimmed)) {
    const idx = parseInt(trimmed, 10) - 1;
    return SCENARIO_LIST[idx] ?? null;
  }
  // Name: must exist in SCENARIOS
  return SCENARIOS[trimmed] ? trimmed : null;
}
