/**
 * Type definitions for the FIRE (Financial Independence, Retire Early) feature.
 *
 * Pure types — no runtime logic, no imports from Raycast.
 * Used across FIRE components, hooks, services, and tests.
 */

// ──────────────────────────────────────────
// Contribution
// ──────────────────────────────────────────

/**
 * A recurring monthly contribution to a specific position.
 *
 * Only references IDs — display names are resolved at render time
 * from the live portfolio data to stay in sync with renames/edits.
 */
export interface FireContribution {
  /** Unique identifier (UUID v4) */
  id: string;
  /** The position that receives this contribution */
  positionId: string;
  /** The account containing the target position */
  accountId: string;
  /** Monthly contribution amount in the user's base currency */
  monthlyAmount: number;
}

// ──────────────────────────────────────────
// Settings
// ──────────────────────────────────────────

/**
 * Persisted FIRE configuration.
 *
 * Stored under its own LocalStorage key (`fire-settings`), completely
 * independent from portfolio data. The FIRE feature reads portfolio
 * data but never modifies it.
 */
export interface FireSettings {
  /** The portfolio value at which financial independence is achieved */
  targetValue: number;

  /** Safe withdrawal rate in retirement, as a percentage (e.g. 4 means 4%) */
  withdrawalRate: number;

  /** Assumed annual inflation rate, as a percentage (e.g. 2.5 means 2.5%) */
  annualInflation: number;

  /**
   * Assumed average annual growth rate for stocks/ETFs, as a percentage.
   * e.g. 7 means 7%. Used together with `annualInflation` to derive the
   * real growth rate: `realRate = annualGrowthRate - annualInflation`.
   */
  annualGrowthRate: number;

  /** Year of birth (e.g. 1990). Used to calculate age at retirement and SIPP access. */
  yearOfBirth: number;

  /** Annual holiday entitlement in days (e.g. 25). Used for working-days-to-FIRE calc. */
  holidayEntitlement: number;

  /** Age at which SIPP / pension becomes accessible (default 57 in UK, rising to 58). */
  sippAccessAge: number;

  /** Optional target FIRE age (mutually exclusive with targetFireYear). */
  targetFireAge?: number | null;

  /** Optional target FIRE calendar year (mutually exclusive with targetFireAge). */
  targetFireYear?: number | null;

  /** Account IDs excluded from the FIRE portfolio value calculation. */
  excludedAccountIds: string[];

  /** Recurring monthly contributions to specific positions. */
  contributions: FireContribution[];

  /** ISO 8601 timestamp of the last settings save. */
  updatedAt: string;
}

// ──────────────────────────────────────────
// Projection (computed, never persisted)
// ──────────────────────────────────────────

/** A single year in the FIRE projection timeline. */
export interface FireProjectionYear {
  /** Calendar year (e.g. 2025) */
  year: number;

  /** Age of the user at the start of this year */
  age: number;

  /**
   * Projected portfolio value at end of year, in today's money (real terms).
   * Includes compound growth on existing value + contributions.
   */
  portfolioValue: number;

  /** True if `portfolioValue >= targetValue` */
  isTargetHit: boolean;

  /** True if the user's age >= sippAccessAge (pension unlocked) */
  isSippAccessible: boolean;
}

/** Full FIRE projection result returned by the calculator. */
export interface FireProjection {
  /** Year-by-year projection timeline */
  years: FireProjectionYear[];

  /** Calendar year when target is first met, or null if not within the projection window */
  fireYear: number | null;

  /** User's age when target is first met, or null */
  fireAge: number | null;

  /** Calendar days from today to Jan 1 of the FIRE year, or null */
  daysToFire: number | null;

  /** Approximate working days to FIRE (business days minus holidays), or null */
  workingDaysToFire: number | null;

  /** The portfolio value used as the starting point (today) */
  currentPortfolioValue: number;

  /** Total annual contribution (sum of all monthly × 12) */
  annualContribution: number;

  /** The real growth rate used: (nominal - inflation) / 100 */
  realGrowthRate: number;

  /** The FIRE target value */
  targetValue: number;

  /** Whether the target is hit within the projection window */
  targetHitInWindow: boolean;
}

// ──────────────────────────────────────────
// Calculator Input (convenience aggregate)
// ──────────────────────────────────────────

/**
 * All inputs needed by the projection calculator.
 * Assembled by the command layer from settings + live portfolio value.
 */
export interface FireCalculatorInput {
  /** Current included portfolio value in base currency */
  currentPortfolioValue: number;
  /** From FireSettings */
  targetValue: number;
  /** From FireSettings, as percentage (e.g. 7) */
  annualGrowthRate: number;
  /** From FireSettings, as percentage (e.g. 2.5) */
  annualInflation: number;
  /** Sum of all monthly contributions × 12 */
  annualContribution: number;
  /** From FireSettings */
  yearOfBirth: number;
  /** From FireSettings */
  sippAccessAge: number;
  /** From FireSettings */
  holidayEntitlement: number;
}

// ──────────────────────────────────────────
// Defaults
// ──────────────────────────────────────────

/** Default values for FIRE settings. */
export const FIRE_DEFAULTS = {
  /** 4% safe withdrawal rate (the "4% rule") */
  withdrawalRate: 4,
  /** 2.5% annual inflation (long-term UK/US average) */
  annualInflation: 2.5,
  /** 7% nominal annual growth (long-term equity average) */
  annualGrowthRate: 7,
  /** 25 days annual leave (UK statutory default) */
  holidayEntitlement: 25,
  /** UK SIPP access age (currently 57, rising to 58 in 2028) */
  sippAccessAge: 57,
  /** Maximum years to project into the future */
  maxProjectionYears: 30,
  /** Years to show beyond the FIRE year on the chart */
  postFireYears: 5,
} as const;

// ──────────────────────────────────────────
// Storage
// ──────────────────────────────────────────

/** LocalStorage key for FIRE settings (separate from portfolio data). */
export const FIRE_STORAGE_KEY = "fire-settings" as const;
