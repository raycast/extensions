/**
 * FIRE projection calculator — pure functions, zero side effects.
 *
 * This module contains all the maths for Financial Independence, Retire Early
 * projections. Every function is deterministic and fully testable without
 * any Raycast or storage dependencies.
 *
 * Key formulas:
 *   Real growth rate = (nominal growth − inflation) / 100
 *   Year N value     = Year(N−1) × (1 + realRate) + annualContribution × (1 + realRate / 2)
 *
 * The contribution growth uses a half-year approximation: since contributions
 * are added monthly throughout the year, on average each pound is invested for
 * half the year. This is a standard simplification that avoids monthly-step
 * compounding while remaining accurate to within ~0.2% of the exact figure.
 */

import { FireCalculatorInput, FireProjection, FireProjectionYear, FIRE_DEFAULTS } from "../utils/fire-types";

// ──────────────────────────────────────────
// Main Projection
// ──────────────────────────────────────────

/**
 * Calculates the full FIRE projection timeline.
 *
 * Projects portfolio value year-by-year from the current year until either:
 *   a) The FIRE target is hit + `postFireYears` additional years, or
 *   b) `maxProjectionYears` is reached (whichever comes first)
 *
 * All values are in **real terms** (today's money). The inflation rate is
 * subtracted from the nominal growth rate to produce a real rate, so the
 * target value stays constant and the chart shows purchasing-power-adjusted
 * growth.
 *
 * @param input - All calculator inputs (portfolio value, settings, contributions)
 * @param now   - Override the current date (for testing). Defaults to `new Date()`.
 * @returns Full projection with timeline, FIRE year, days remaining, etc.
 *
 * @example
 * const projection = calculateProjection({
 *   currentPortfolioValue: 200_000,
 *   targetValue: 1_000_000,
 *   annualGrowthRate: 7,
 *   annualInflation: 2.5,
 *   annualContribution: 24_000,
 *   yearOfBirth: 1990,
 *   sippAccessAge: 57,
 *   holidayEntitlement: 25,
 * });
 */
export function calculateProjection(input: FireCalculatorInput, now: Date = new Date()): FireProjection {
  const {
    currentPortfolioValue,
    targetValue,
    annualGrowthRate,
    annualInflation,
    annualContribution,
    yearOfBirth,
    sippAccessAge,
    holidayEntitlement,
  } = input;

  const realRate = calculateRealGrowthRate(annualGrowthRate, annualInflation);
  const currentYear = now.getFullYear();
  const maxYears = FIRE_DEFAULTS.maxProjectionYears;
  const postYears = FIRE_DEFAULTS.postFireYears;

  const years: FireProjectionYear[] = [];
  let fireYear: number | null = null;

  // Year 0 = current year (starting point)
  for (let n = 0; n <= maxYears; n++) {
    const year = currentYear + n;
    const age = year - yearOfBirth;

    // Once FIRE is achieved, no more contributions are added — the portfolio
    // just compounds. `fireYear` is set at the END of the iteration that hits
    // the target, so the FIRE year itself still includes contributions (you're
    // still working that year), but all subsequent years use zero.
    const contribForYear = fireYear !== null ? 0 : annualContribution;

    const portfolioValue =
      n === 0 ? currentPortfolioValue : projectYearValue(years[n - 1].portfolioValue, realRate, contribForYear);
    const isTargetHit = portfolioValue >= targetValue;
    const isSippAccessible = age >= sippAccessAge;

    years.push({ year, age, portfolioValue, isTargetHit, isSippAccessible });

    // Record the first year the target is hit
    if (isTargetHit && fireYear === null) {
      fireYear = year;
    }

    // Stop early: show postFireYears beyond the FIRE year
    if (fireYear !== null && year >= fireYear + postYears) {
      break;
    }
  }

  // ── Derived metrics ──

  const fireAge = fireYear !== null ? fireYear - yearOfBirth : null;
  const targetHitInWindow = fireYear !== null;
  const daysToFire = fireYear !== null ? calculateDaysUntil(fireYear, now) : null;
  const workingDaysToFire =
    daysToFire !== null && fireYear !== null
      ? calculateWorkingDays(daysToFire, yearsUntil(fireYear, now), holidayEntitlement)
      : null;

  return {
    years,
    fireYear,
    fireAge,
    daysToFire,
    workingDaysToFire,
    currentPortfolioValue,
    annualContribution,
    realGrowthRate: realRate,
    targetValue,
    targetHitInWindow,
  };
}

// ──────────────────────────────────────────
// Year-by-Year Growth
// ──────────────────────────────────────────

/**
 * Projects the portfolio value for one year forward.
 *
 * Formula:
 *   newValue = previousValue × (1 + realRate) + annualContribution × (1 + realRate / 2)
 *
 * The first term compounds the existing portfolio for a full year.
 * The second term adds this year's contributions with half-year average growth
 * (since contributions arrive monthly, each is invested for ~6 months on average).
 *
 * @param previousValue      - Portfolio value at the end of the previous year
 * @param realRate           - Real annual growth rate as a decimal (e.g. 0.045)
 * @param annualContribution - Total contributions for the year (monthly × 12)
 * @returns Projected value at end of year
 */
export function projectYearValue(previousValue: number, realRate: number, annualContribution: number): number {
  const growthOnExisting = previousValue * (1 + realRate);
  const contributionWithGrowth = annualContribution * (1 + realRate / 2);
  return growthOnExisting + contributionWithGrowth;
}

// ──────────────────────────────────────────
// FIRE Number Calculator
// ──────────────────────────────────────────

/**
 * Calculates the FIRE number from spending and withdrawal rate.
 *
 * Formula: FIRE Number = Monthly Spending × 12 × (100 / Withdrawal Rate)
 *
 * At a 4% withdrawal rate: FIRE Number = Annual Spending × 25
 *
 * @param monthlySpending - Monthly spending in base currency
 * @param withdrawalRate  - Safe withdrawal rate as a percentage (e.g. 4)
 * @returns The required portfolio value for financial independence
 *
 * @example
 * calculateFireNumber(3000, 4)  // 900_000  (3000 × 12 × 25)
 * calculateFireNumber(2000, 3)  // 800_000  (2000 × 12 × 33.33)
 */
export function calculateFireNumber(monthlySpending: number, withdrawalRate: number): number {
  if (withdrawalRate <= 0) return 0;
  return monthlySpending * 12 * (100 / withdrawalRate);
}

// ──────────────────────────────────────────
// Real Growth Rate
// ──────────────────────────────────────────

/**
 * Converts nominal growth and inflation percentages to a real growth rate decimal.
 *
 * Uses simple subtraction (Fisher approximation) which is accurate enough
 * for the 0–15% range typical of equity returns and consumer inflation.
 *
 * @param nominalGrowthPercent - Nominal annual growth as a percentage (e.g. 7)
 * @param inflationPercent     - Annual inflation as a percentage (e.g. 2.5)
 * @returns Real growth rate as a decimal (e.g. 0.045 for 4.5%)
 *
 * @example
 * calculateRealGrowthRate(7, 2.5)  // 0.045
 * calculateRealGrowthRate(5, 5)    // 0.0
 * calculateRealGrowthRate(3, 5)    // -0.02
 */
export function calculateRealGrowthRate(nominalGrowthPercent: number, inflationPercent: number): number {
  return (nominalGrowthPercent - inflationPercent) / 100;
}

// ──────────────────────────────────────────
// Days & Working Days
// ──────────────────────────────────────────

/**
 * Calculates the number of calendar days from `now` to January 1st of `targetYear`.
 *
 * Returns 0 if the target year is in the past or is the current year.
 *
 * @param targetYear - The calendar year to count to (e.g. 2033)
 * @param now        - The current date
 * @returns Number of calendar days (≥ 0)
 */
export function calculateDaysUntil(targetYear: number, now: Date = new Date()): number {
  const target = new Date(targetYear, 0, 1); // January 1st of target year
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calculates the fractional years from `now` to January 1st of `targetYear`.
 *
 * @param targetYear - The calendar year to count to
 * @param now        - The current date
 * @returns Fractional years (≥ 0)
 */
export function yearsUntil(targetYear: number, now: Date = new Date()): number {
  const days = calculateDaysUntil(targetYear, now);
  return days / 365.25;
}

/**
 * Estimates working days from total calendar days.
 *
 * Formula:
 *   businessDays  = totalDays × (5 / 7)
 *   workingDays   = businessDays − (holidayEntitlement × yearsRemaining)
 *
 * This is an approximation — it doesn't account for actual weekends,
 * bank holidays, or partial years. Sufficient for motivational display.
 *
 * @param totalDays          - Total calendar days to FIRE
 * @param yearsRemaining     - Fractional years to FIRE
 * @param holidayEntitlement - Annual holiday days (e.g. 25)
 * @returns Estimated working days (≥ 0)
 */
export function calculateWorkingDays(totalDays: number, yearsRemaining: number, holidayEntitlement: number): number {
  const businessDays = totalDays * (5 / 7);
  const totalHolidays = holidayEntitlement * yearsRemaining;
  return Math.max(0, Math.round(businessDays - totalHolidays));
}

// ──────────────────────────────────────────
// Contribution Helpers
// ──────────────────────────────────────────

/**
 * Sums all monthly contributions into an annual total.
 *
 * Filters out contributions with invalid (≤ 0) amounts.
 *
 * @param contributions - Array of monthly contribution entries
 * @returns Total annual contribution (sum of monthly × 12)
 */
export function totalAnnualContribution(contributions: Array<{ monthlyAmount: number }>): number {
  const monthlyTotal = contributions.filter((c) => c.monthlyAmount > 0).reduce((sum, c) => sum + c.monthlyAmount, 0);
  return monthlyTotal * 12;
}
