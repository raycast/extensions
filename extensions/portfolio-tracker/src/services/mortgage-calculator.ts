/**
 * Mortgage amortization calculator — pure math, zero side effects.
 *
 * Provides functions to calculate:
 * 1. Monthly mortgage payment (standard amortization formula)
 * 2. Principal vs interest split for any given month
 * 3. Cumulative principal paid between two dates
 * 4. Current equity accounting for principal repayment + HPI appreciation
 *
 * All functions are pure — no Raycast imports, no API calls, no state.
 * Fully testable without mocks.
 */

import { MortgageData, hasMortgageRepaymentData } from "../utils/types";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

/** Result of the current equity calculation */
export interface EquityCalculation {
  /** Original equity at time of valuation (all partners combined) */
  originalEquity: number;

  /**
   * The user's own share of equity at valuation (= myEquityShare from MortgageData).
   * Equals `originalEquity` when no shared ownership is configured.
   * Used as the denominator for equity change % calculations.
   */
  adjustedOriginalEquity: number;

  /** Cumulative principal repaid since valuation date (0 if no repayment data) */
  principalRepaid: number;

  /** Value gained from property price appreciation (can be negative) */
  appreciation: number;

  /** Current total equity = originalEquity + principalRepaid + appreciation (all partners) */
  currentEquity: number;

  /**
   * Net change since valuation = principalRepaid + appreciation.
   * This is the new value created (or lost) that gets split by shared ownership.
   */
  netChange: number;

  /**
   * User's final equity after shared ownership adjustment.
   * Equals `currentEquity` when no shared ownership is configured.
   *
   * Formula:
   *   netChange = principalRepaid + appreciation
   *   adjustedEquity = myEquityShare + (netChange × sharedOwnershipPercent / 100)
   */
  adjustedEquity: number;

  /** Current estimated property value (totalPropertyValue adjusted for HPI) */
  currentPropertyValue: number;

  /** Outstanding mortgage balance (0 for OWNED_PROPERTY) */
  outstandingBalance: number;

  /** HPI percentage change since valuation (e.g. 4.2 means +4.2%) */
  hpiChangePercent: number;

  /** Shared ownership percentage applied (100 if sole ownership / not configured) */
  sharedOwnershipPercent: number;

  /** User's own share of the deposit/equity at valuation (0 if not configured) */
  myEquityShare: number;
}

/** Principal and interest breakdown for a single monthly payment */
export interface MonthlyBreakdown {
  /** The month number (1-based from mortgage start) */
  monthNumber: number;

  /** Total monthly payment amount */
  payment: number;

  /** Portion of payment going to principal */
  principal: number;

  /** Portion of payment going to interest */
  interest: number;

  /** Remaining balance after this payment */
  remainingBalance: number;
}

// ──────────────────────────────────────────
// Core Amortization Functions
// ──────────────────────────────────────────

/**
 * Calculates the fixed monthly mortgage payment using the standard
 * amortization formula:
 *
 *   M = P × [r(1+r)^n] / [(1+r)^n - 1]
 *
 * where:
 *   P = principal (loan amount)
 *   r = monthly interest rate (annual rate / 12 / 100)
 *   n = total number of monthly payments (term in years × 12)
 *
 * @param principal - The loan amount (e.g. 250000)
 * @param annualRate - Annual interest rate as a percentage (e.g. 4.5 means 4.5%)
 * @param termYears - Mortgage term in years (e.g. 25)
 * @returns Monthly payment amount
 *
 * @example
 * calculateMonthlyPayment(250000, 4.5, 25) // ≈ £1,389.58
 */
export function calculateMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0;
  if (termYears <= 0) return 0;

  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;

  // Edge case: 0% interest — simple division
  if (monthlyRate === 0) {
    return principal / totalPayments;
  }

  const factor = Math.pow(1 + monthlyRate, totalPayments);
  return (principal * (monthlyRate * factor)) / (factor - 1);
}

/**
 * Calculates the principal and interest breakdown for a specific month
 * in the amortization schedule.
 *
 * Month numbering is 1-based from the start of the mortgage.
 *
 * @param principal - Original loan amount
 * @param annualRate - Annual interest rate as a percentage
 * @param termYears - Mortgage term in years
 * @param monthNumber - Which month to calculate (1-based)
 * @returns Breakdown of principal, interest, and remaining balance
 *
 * @example
 * const month1 = calculateMonthBreakdown(250000, 4.5, 25, 1);
 * // month1.interest ≈ £937.50 (high at start)
 * // month1.principal ≈ £452.08 (low at start)
 *
 * const month300 = calculateMonthBreakdown(250000, 4.5, 25, 300);
 * // month300.interest ≈ £5.17 (low at end)
 * // month300.principal ≈ £1,384.41 (high at end)
 */
export function calculateMonthBreakdown(
  principal: number,
  annualRate: number,
  termYears: number,
  monthNumber: number,
): MonthlyBreakdown {
  const payment = calculateMonthlyPayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;

  if (monthNumber < 1 || monthNumber > totalPayments || principal <= 0) {
    return {
      monthNumber,
      payment: 0,
      principal: 0,
      interest: 0,
      remainingBalance: monthNumber < 1 ? principal : 0,
    };
  }

  // Calculate remaining balance at start of this month
  // by computing balance after (monthNumber - 1) payments
  let balance = principal;

  if (monthlyRate === 0) {
    // 0% interest: simple linear paydown
    const monthlyPrincipal = principal / totalPayments;
    balance = principal - monthlyPrincipal * (monthNumber - 1);
    return {
      monthNumber,
      payment,
      principal: monthlyPrincipal,
      interest: 0,
      remainingBalance: Math.max(0, balance - monthlyPrincipal),
    };
  }

  // Standard amortization: iterate to find balance at start of this month
  for (let m = 1; m < monthNumber; m++) {
    const interestPortion = balance * monthlyRate;
    const principalPortion = payment - interestPortion;
    balance -= principalPortion;
  }

  const interestThisMonth = balance * monthlyRate;
  const principalThisMonth = payment - interestThisMonth;
  const remainingBalance = Math.max(0, balance - principalThisMonth);

  return {
    monthNumber,
    payment,
    principal: principalThisMonth,
    interest: interestThisMonth,
    remainingBalance,
  };
}

/**
 * Calculates the cumulative principal repaid between two dates.
 *
 * Determines which months of the amortization schedule fall between
 * `fromDate` and `toDate`, then sums the principal portion of each
 * monthly payment in that range.
 *
 * @param principal - Original loan amount
 * @param annualRate - Annual interest rate as a percentage
 * @param termYears - Mortgage term in years
 * @param mortgageStartDate - ISO date string when the mortgage started
 * @param fromDate - ISO date string — start of the period (inclusive)
 * @param toDate - ISO date string — end of the period (inclusive)
 * @returns Total principal repaid in the period
 *
 * @example
 * // Principal repaid from Jun 2023 to Jul 2025 on a mortgage that started Jan 2020
 * calculateCumulativePrincipal(250000, 4.5, 25, "2020-01-15", "2023-06-15", "2025-07-15")
 */
export function calculateCumulativePrincipal(
  principal: number,
  annualRate: number,
  termYears: number,
  mortgageStartDate: string,
  fromDate: string,
  toDate: string,
): number {
  if (principal <= 0 || termYears <= 0) return 0;

  const start = new Date(mortgageStartDate);
  const from = new Date(fromDate);
  const to = new Date(toDate);

  if (isNaN(start.getTime()) || isNaN(from.getTime()) || isNaN(to.getTime())) {
    return 0;
  }

  // Calculate which month numbers these dates correspond to
  const fromMonthNumber = monthsBetween(start, from) + 1; // +1 because month 1 is the first payment month
  const toMonthNumber = monthsBetween(start, to) + 1;
  const totalPayments = termYears * 12;

  // Clamp to valid range
  const startMonth = Math.max(1, fromMonthNumber);
  const endMonth = Math.min(totalPayments, toMonthNumber);

  if (startMonth > endMonth) return 0;

  // For efficiency: compute balance at startMonth, then iterate forward
  const monthlyRate = annualRate / 100 / 12;
  const payment = calculateMonthlyPayment(principal, annualRate, termYears);

  let balance = principal;
  let cumulativePrincipal = 0;

  if (monthlyRate === 0) {
    const monthlyPrincipal = principal / totalPayments;
    const monthsInRange = endMonth - startMonth + 1;
    return monthlyPrincipal * monthsInRange;
  }

  // Fast-forward to startMonth
  for (let m = 1; m < startMonth; m++) {
    const interestPortion = balance * monthlyRate;
    const principalPortion = payment - interestPortion;
    balance -= principalPortion;
  }

  // Accumulate principal from startMonth to endMonth
  for (let m = startMonth; m <= endMonth; m++) {
    const interestPortion = balance * monthlyRate;
    const principalPortion = payment - interestPortion;
    cumulativePrincipal += principalPortion;
    balance -= principalPortion;
  }

  return Math.max(0, cumulativePrincipal);
}

// ──────────────────────────────────────────
// High-Level Equity Calculation
// ──────────────────────────────────────────

/**
 * Calculates the current equity for a property position, accounting for:
 * 1. Original equity at valuation
 * 2. Principal repayment since valuation (if mortgage data available)
 * 3. Property price appreciation via HPI change
 *
 * The formula:
 *   currentPropertyValue = totalPropertyValue × (1 + hpiChange/100)
 *   outstandingBalance = (totalPropertyValue - equity) - principalRepaid
 *   currentEquity = currentPropertyValue - outstandingBalance
 *
 * Which simplifies to:
 *   currentEquity = equity + principalRepaid + (totalPropertyValue × hpiChange/100)
 *
 * Equity grows from three sources:
 * - Original equity (deposit + any prior payments)
 * - Principal portion of mortgage payments since valuation
 * - Market appreciation of the property
 *
 * @param mortgageData - The mortgage/property data from the position
 * @param hpiChangePercent - HPI percentage change since valuation (e.g. 4.2 means +4.2%)
 * @param asOfDate - ISO date string for the "current" date (defaults to today)
 * @returns Full equity calculation breakdown
 *
 * @example
 * const result = calculateCurrentEquity(mortgageData, 4.2);
 * // result.currentEquity = 115,700 (original 100k + 1.2k principal + 14.5k appreciation)
 */
export function calculateCurrentEquity(
  mortgageData: MortgageData,
  hpiChangePercent: number,
  asOfDate?: string,
): EquityCalculation {
  const { totalPropertyValue, equity } = mortgageData;
  const today = asOfDate ?? new Date().toISOString().split("T")[0];

  // ── Property appreciation ──
  const currentPropertyValue = totalPropertyValue * (1 + hpiChangePercent / 100);
  const appreciation = currentPropertyValue - totalPropertyValue;

  // ── Principal repayment ──
  let principalRepaid = 0;

  if (hasMortgageRepaymentData(mortgageData)) {
    const outstandingAtValuation = totalPropertyValue - equity;

    if (outstandingAtValuation > 0) {
      // We need to figure out where in the amortization schedule the valuation date falls,
      // then sum principal from valuation to now.
      principalRepaid = calculateCumulativePrincipal(
        outstandingAtValuation,
        mortgageData.mortgageRate!,
        mortgageData.mortgageTerm!,
        mortgageData.mortgageStartDate!,
        mortgageData.valuationDate,
        today,
      );
    }
  }

  // ── Outstanding balance ──
  const originalOutstanding = totalPropertyValue - equity;
  const outstandingBalance = Math.max(0, originalOutstanding - principalRepaid);

  // ── Current equity (full, before shared ownership) ──
  const currentEquity = currentPropertyValue - outstandingBalance;

  // ── Shared ownership adjustment ──
  // The net change (principal repaid + market appreciation) is the new value
  // created since valuation. Shared ownership splits only the net change.
  // myEquityShare is the user's own portion of the original deposit — unaffected
  // by the ownership ratio.
  //
  // Formula:
  //   netChange = principalRepaid + appreciation
  //   adjustedEquity = myEquityShare + (netChange × ownershipPercent / 100)
  const ownershipPercent = mortgageData.sharedOwnershipPercent ?? 100;
  const myShare = mortgageData.myEquityShare ?? 0;
  const netChange = principalRepaid + appreciation;

  let adjustedEquity: number;
  let adjustedOriginalEquity: number;

  if (ownershipPercent >= 100) {
    // Sole ownership (100%) — myEquityShare is irrelevant, user owns everything
    adjustedEquity = currentEquity;
    adjustedOriginalEquity = equity;
  } else if (myShare <= 0) {
    // Shared ownership but no personal share specified — split full equity
    adjustedEquity = (currentEquity * ownershipPercent) / 100;
    adjustedOriginalEquity = (equity * ownershipPercent) / 100;
  } else {
    // Full model: user's share of deposit + their share of the net change
    adjustedEquity = myShare + (netChange * ownershipPercent) / 100;
    adjustedOriginalEquity = myShare; // at valuation time, net change was 0
  }

  return {
    originalEquity: equity,
    adjustedOriginalEquity,
    principalRepaid,
    appreciation,
    currentEquity,
    netChange,
    adjustedEquity,
    currentPropertyValue,
    outstandingBalance,
    hpiChangePercent,
    sharedOwnershipPercent: ownershipPercent,
    myEquityShare: myShare,
  };
}

// ──────────────────────────────────────────
// Utility: Principal/Interest Ratio
// ──────────────────────────────────────────

/**
 * Returns the current principal-to-interest ratio for a mortgage,
 * useful for display purposes (e.g. "Your payment is 45% principal,
 * 55% interest").
 *
 * @param mortgageData - The mortgage data
 * @param asOfDate - Optional date to calculate the ratio for (defaults to today)
 * @returns Object with `principalPercent` and `interestPercent` (each 0–100),
 *          or null if mortgage repayment data is not available
 */
export function getCurrentPrincipalInterestRatio(
  mortgageData: MortgageData,
  asOfDate?: string,
): { principalPercent: number; interestPercent: number; monthlyPayment: number } | null {
  if (!hasMortgageRepaymentData(mortgageData)) {
    return null;
  }

  const outstandingAtStart = mortgageData.totalPropertyValue - mortgageData.equity;
  if (outstandingAtStart <= 0) return null;

  const today = asOfDate ?? new Date().toISOString().split("T")[0];
  const startDate = new Date(mortgageData.mortgageStartDate!);
  const currentDate = new Date(today);

  const currentMonth = monthsBetween(startDate, currentDate) + 1;
  const totalMonths = mortgageData.mortgageTerm! * 12;

  if (currentMonth < 1 || currentMonth > totalMonths) return null;

  const breakdown = calculateMonthBreakdown(
    outstandingAtStart,
    mortgageData.mortgageRate!,
    mortgageData.mortgageTerm!,
    currentMonth,
  );

  if (breakdown.payment <= 0) return null;

  return {
    principalPercent: (breakdown.principal / breakdown.payment) * 100,
    interestPercent: (breakdown.interest / breakdown.payment) * 100,
    monthlyPayment: breakdown.payment,
  };
}

// ──────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────

/**
 * Calculates the number of whole months between two dates.
 * A partial month at the end is not counted.
 *
 * @param from - Start date
 * @param to - End date
 * @returns Number of months (0 if same month, negative if to < from)
 */
function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}
