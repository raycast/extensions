/**
 * Debt calculator — pure functions, zero side effects.
 *
 * This module contains all the maths for debt tracking, amortisation,
 * and repayment projections. Every function is deterministic and fully
 * testable without any Raycast or storage dependencies.
 *
 * Key formulas:
 *
 *   **Standard amortisation (fixed-rate loan):**
 *   M = P × [r(1+r)^n] / [(1+r)^n - 1]
 *   where:
 *     M = monthly payment
 *     P = principal (loan amount)
 *     r = monthly interest rate (APR / 12 / 100)
 *     n = total number of payments (months)
 *
 *   **Simple monthly balance update (credit card / general):**
 *   newBalance = oldBalance × (1 + APR / 12 / 100) - monthlyRepayment
 *
 *   **Months between two dates:**
 *   (endYear - startYear) × 12 + (endMonth - startMonth)
 *
 * @module debt-calculator
 */

import { DebtData, hasLoanTermData } from "../utils/types";

// ──────────────────────────────────────────
// Amortisation
// ──────────────────────────────────────────

/**
 * Calculates the fixed monthly payment for an amortised loan.
 *
 * Uses the standard amortisation formula:
 *   M = P × [r(1+r)^n] / [(1+r)^n - 1]
 *
 * For 0% APR loans, returns simple division: P / n
 *
 * @param principal   - Total loan amount (outstanding balance)
 * @param annualRate  - Annual percentage rate as a percentage (e.g. 5.5 means 5.5%)
 * @param totalMonths - Total number of monthly payments
 * @returns Monthly payment amount
 *
 * @example
 * calculateAmortisedPayment(10000, 5.5, 60)  // ~190.99
 * calculateAmortisedPayment(5000, 0, 24)      // 208.33
 */
export function calculateAmortisedPayment(principal: number, annualRate: number, totalMonths: number): number {
  if (totalMonths <= 0) return 0;
  if (principal <= 0) return 0;

  // 0% APR — simple division
  if (annualRate <= 0) {
    return principal / totalMonths;
  }

  const r = annualRate / 12 / 100;
  const factor = Math.pow(1 + r, totalMonths);
  return (principal * r * factor) / (factor - 1);
}

// ──────────────────────────────────────────
// Monthly Balance Update
// ──────────────────────────────────────────

/**
 * Result of a single monthly balance update.
 */
export interface MonthlyUpdateResult {
  /** Balance after interest accrual and repayment deduction */
  newBalance: number;
  /** Interest charged this month */
  interestCharged: number;
  /** Principal portion of the repayment (repayment - interest, or remainder if balance < repayment) */
  principalPaid: number;
  /** Whether the debt is fully paid off after this update */
  isPaidOff: boolean;
}

/**
 * Applies one month's interest and repayment to a debt balance.
 *
 * Formula:
 *   balanceWithInterest = balance × (1 + APR / 12 / 100)
 *   newBalance = max(0, balanceWithInterest - monthlyRepayment)
 *
 * If the repayment exceeds the balance + interest, the balance goes to 0
 * and the debt is marked as paid off.
 *
 * @param balance          - Current outstanding balance
 * @param apr              - Annual percentage rate as a percentage (e.g. 19.9)
 * @param monthlyRepayment - Fixed monthly repayment amount
 * @returns Updated balance details
 *
 * @example
 * applyMonthlyUpdate(5000, 19.9, 200)
 * // { newBalance: 4882.92, interestCharged: 82.92, principalPaid: 117.08, isPaidOff: false }
 */
export function applyMonthlyUpdate(balance: number, apr: number, monthlyRepayment: number): MonthlyUpdateResult {
  if (balance <= 0) {
    return { newBalance: 0, interestCharged: 0, principalPaid: 0, isPaidOff: true };
  }

  const monthlyRate = apr / 12 / 100;
  const interestCharged = balance * monthlyRate;
  const balanceWithInterest = balance + interestCharged;

  if (monthlyRepayment >= balanceWithInterest) {
    // Final payment — clears the debt
    return {
      newBalance: 0,
      interestCharged,
      principalPaid: balance,
      isPaidOff: true,
    };
  }

  const principalPaid = monthlyRepayment - interestCharged;
  const newBalance = balanceWithInterest - monthlyRepayment;

  return {
    newBalance: Math.max(0, newBalance),
    interestCharged,
    principalPaid: Math.max(0, principalPaid),
    isPaidOff: newBalance <= 0.01, // sub-penny threshold
  };
}

// ──────────────────────────────────────────
// Multi-Month Projection
// ──────────────────────────────────────────

/**
 * A single step in the repayment projection timeline.
 */
export interface RepaymentStep {
  /** Month number (1-based, 1 = first month) */
  month: number;
  /** Balance at end of this month */
  balance: number;
  /** Interest charged this month */
  interest: number;
  /** Principal paid this month */
  principal: number;
  /** Cumulative interest paid up to and including this month */
  cumulativeInterest: number;
  /** Cumulative principal paid up to and including this month */
  cumulativePrincipal: number;
}

/**
 * Projects the full repayment schedule from the current balance
 * until the debt is fully paid off or `maxMonths` is reached.
 *
 * @param balance          - Current outstanding balance
 * @param apr              - Annual percentage rate as a percentage
 * @param monthlyRepayment - Fixed monthly repayment amount
 * @param maxMonths        - Safety cap to prevent infinite loops (default 600 = 50 years)
 * @returns Array of repayment steps
 */
export function projectRepaymentSchedule(
  balance: number,
  apr: number,
  monthlyRepayment: number,
  maxMonths: number = 600,
): RepaymentStep[] {
  const steps: RepaymentStep[] = [];

  if (balance <= 0 || monthlyRepayment <= 0) return steps;

  // Check if repayment covers at least the interest — otherwise debt grows forever
  const monthlyInterest = balance * (apr / 12 / 100);
  if (monthlyRepayment <= monthlyInterest && apr > 0) {
    // Repayment doesn't cover interest — cap at maxMonths to avoid infinite loop
    // but still show the schedule for as long as allowed
  }

  let currentBalance = balance;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  for (let month = 1; month <= maxMonths; month++) {
    const result = applyMonthlyUpdate(currentBalance, apr, monthlyRepayment);

    cumulativeInterest += result.interestCharged;
    cumulativePrincipal += result.principalPaid;

    steps.push({
      month,
      balance: result.newBalance,
      interest: result.interestCharged,
      principal: result.principalPaid,
      cumulativeInterest,
      cumulativePrincipal,
    });

    currentBalance = result.newBalance;

    if (result.isPaidOff) break;
  }

  return steps;
}

// ──────────────────────────────────────────
// Loan Progress
// ──────────────────────────────────────────

/**
 * Progress information for a loan with known start/end dates.
 */
export interface LoanProgress {
  /** Total term in months */
  totalMonths: number;
  /** Months elapsed since loan start */
  monthsElapsed: number;
  /** Months remaining */
  monthsRemaining: number;
  /** Progress as a percentage (0–100) */
  progressPercent: number;
  /** Whether the loan term has been completed */
  isTermComplete: boolean;
}

/**
 * Calculates progress through a loan term based on start and end dates.
 *
 * @param startDate - ISO 8601 date string when the loan started
 * @param endDate   - ISO 8601 date string when the loan ends
 * @param now       - Override the current date (for testing). Defaults to `new Date()`.
 * @returns Progress information
 *
 * @example
 * calculateLoanProgress("2022-01-15", "2027-01-15")
 * // { totalMonths: 60, monthsElapsed: 30, monthsRemaining: 30, progressPercent: 50, isTermComplete: false }
 */
export function calculateLoanProgress(startDate: string, endDate: string, now: Date = new Date()): LoanProgress {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const totalMonths = monthsBetweenDates(start, end);
  const monthsElapsed = Math.max(0, monthsBetweenDates(start, now));
  const monthsRemaining = Math.max(0, totalMonths - monthsElapsed);
  const progressPercent = totalMonths > 0 ? Math.min(100, (monthsElapsed / totalMonths) * 100) : 0;
  const isTermComplete = monthsElapsed >= totalMonths;

  return {
    totalMonths,
    monthsElapsed,
    monthsRemaining,
    progressPercent,
    isTermComplete,
  };
}

// ──────────────────────────────────────────
// Current Balance Calculation
// ──────────────────────────────────────────

/**
 * Full result of calculating the current debt balance.
 */
export interface DebtBalanceResult {
  /** The current outstanding balance after all auto-applied repayments */
  currentBalance: number;
  /** Total interest accrued since the debt was entered */
  totalInterestAccrued: number;
  /** Total principal repaid since the debt was entered */
  totalPrincipalRepaid: number;
  /** Number of repayments that have been applied */
  repaymentsApplied: number;
  /** Whether the debt is fully paid off */
  isPaidOff: boolean;
  /** Months until payoff (from current balance), null if not calculable */
  monthsToPayoff: number | null;
  /** Loan progress info (only for loans with start/end dates) */
  loanProgress: LoanProgress | null;
}

/**
 * Calculates the current debt balance by applying all repayments
 * that should have occurred between `enteredAt` and now.
 *
 * This is a pure calculation — it does not persist anything.
 * The caller (debt-repayments service) is responsible for caching.
 *
 * @param debtData              - The debt configuration
 * @param appliedRepaymentCount - Number of repayments already applied and persisted
 * @param now                   - Override the current date (for testing)
 * @returns Current balance and related metrics
 */
export function calculateCurrentDebtBalance(
  debtData: DebtData,
  appliedRepaymentCount: number = 0,
  now: Date = new Date(),
): DebtBalanceResult {
  const { currentBalance, apr, monthlyRepayment, repaymentDayOfMonth, enteredAt } = debtData;

  // Calculate how many repayments should have occurred by now
  const totalDueRepayments = countRepaymentsDue(enteredAt, repaymentDayOfMonth, now);

  // The number of NEW repayments to apply (beyond what's already been persisted)
  const newRepayments = Math.max(0, totalDueRepayments - appliedRepaymentCount);

  // Apply repayments sequentially
  let balance = currentBalance;
  let totalInterest = 0;
  let totalPrincipal = 0;

  // First, replay the already-applied repayments to get the current persisted balance
  for (let i = 0; i < appliedRepaymentCount; i++) {
    const result = applyMonthlyUpdate(balance, apr, monthlyRepayment);
    totalInterest += result.interestCharged;
    totalPrincipal += result.principalPaid;
    balance = result.newBalance;
    if (result.isPaidOff) break;
  }

  // Then apply any new repayments
  for (let i = 0; i < newRepayments; i++) {
    const result = applyMonthlyUpdate(balance, apr, monthlyRepayment);
    totalInterest += result.interestCharged;
    totalPrincipal += result.principalPaid;
    balance = result.newBalance;
    if (result.isPaidOff) break;
  }

  const isPaidOff = balance <= 0.01;

  // Calculate months to payoff from current balance
  let monthsToPayoff: number | null = null;
  if (!isPaidOff && monthlyRepayment > 0) {
    const schedule = projectRepaymentSchedule(balance, apr, monthlyRepayment);
    monthsToPayoff = schedule.length > 0 ? schedule.length : null;
  }

  // Loan progress (only for loans with start/end dates)
  let loanProgress: LoanProgress | null = null;
  if (hasLoanTermData(debtData) && debtData.loanStartDate && debtData.loanEndDate) {
    loanProgress = calculateLoanProgress(debtData.loanStartDate, debtData.loanEndDate, now);
  }

  return {
    currentBalance: Math.max(0, balance),
    totalInterestAccrued: totalInterest,
    totalPrincipalRepaid: totalPrincipal,
    repaymentsApplied: appliedRepaymentCount + newRepayments,
    isPaidOff,
    monthsToPayoff,
    loanProgress,
  };
}

// ──────────────────────────────────────────
// Repayment Counting
// ──────────────────────────────────────────

/**
 * Counts how many repayment days have passed between the entry date
 * and the current date, given a specific repayment day of month.
 *
 * A repayment is counted if the repayment day in a given month
 * has passed (i.e., today >= that day in that month).
 *
 * For months with fewer days than `repaymentDay` (e.g. day 31 in
 * February), the repayment is counted on the last day of that month.
 *
 * @param enteredAt      - ISO 8601 date string when the debt was entered
 * @param repaymentDay   - Day of month for repayment (1–31)
 * @param now            - Current date
 * @returns Number of repayment days that have passed
 */
export function countRepaymentsDue(enteredAt: string, repaymentDay: number, now: Date = new Date()): number {
  const entryDate = new Date(enteredAt);
  let count = 0;

  // Start from the month after entry and count forward
  const startYear = entryDate.getFullYear();
  const startMonth = entryDate.getMonth(); // 0-based

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDay = now.getDate();

  // Iterate month by month from entry to now
  let year = startYear;
  let month = startMonth;

  // If the entry was before the repayment day in the entry month,
  // include that month; otherwise start from the next month
  const entryDay = entryDate.getDate();
  const effectiveRepaymentDayInEntryMonth = Math.min(repaymentDay, daysInMonth(year, month));
  if (entryDay > effectiveRepaymentDayInEntryMonth) {
    // Entry was strictly after the repayment day — first repayment is next month.
    // If entered ON the repayment day, today counts as the first due repayment.
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  while (year < nowYear || (year === nowYear && month <= nowMonth)) {
    const effectiveDay = Math.min(repaymentDay, daysInMonth(year, month));

    if (year < nowYear || (year === nowYear && month < nowMonth)) {
      // Entire month has passed — repayment was due
      count++;
    } else if (year === nowYear && month === nowMonth) {
      // Current month — only count if repayment day has passed
      if (nowDay >= effectiveDay) {
        count++;
      }
    }

    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return count;
}

// ──────────────────────────────────────────
// Payoff Summary
// ──────────────────────────────────────────

/**
 * Summary of a debt position for display purposes.
 */
export interface DebtSummary {
  /** Current outstanding balance */
  balance: number;
  /** Monthly repayment amount */
  monthlyRepayment: number;
  /** APR as a percentage */
  apr: number;
  /** Percentage of original debt paid off (0–100) */
  paidOffPercent: number;
  /** Total amount repaid so far */
  totalRepaid: number;
  /** Estimated months until payoff (null if not calculable) */
  monthsToPayoff: number | null;
  /** Estimated payoff date (null if not calculable) */
  estimatedPayoffDate: string | null;
  /** Whether the debt is fully paid off */
  isPaidOff: boolean;
  /** Loan progress (only for loans with start/end dates) */
  loanProgress: LoanProgress | null;
}

/**
 * Builds a display summary for a debt position.
 *
 * @param debtData              - The debt configuration
 * @param appliedRepaymentCount - Number of repayments already applied
 * @param now                   - Override the current date
 * @returns Summary for display
 */
export function buildDebtSummary(
  debtData: DebtData,
  appliedRepaymentCount: number = 0,
  now: Date = new Date(),
): DebtSummary {
  const balanceResult = calculateCurrentDebtBalance(debtData, appliedRepaymentCount, now);

  const originalBalance = debtData.currentBalance;
  const totalRepaid = balanceResult.totalPrincipalRepaid;
  const paidOffPercent = originalBalance > 0 ? Math.min(100, (totalRepaid / originalBalance) * 100) : 0;

  let estimatedPayoffDate: string | null = null;
  if (balanceResult.monthsToPayoff !== null) {
    const payoffDate = new Date(now);
    payoffDate.setMonth(payoffDate.getMonth() + balanceResult.monthsToPayoff);
    estimatedPayoffDate = payoffDate.toISOString().split("T")[0];
  }

  return {
    balance: balanceResult.currentBalance,
    monthlyRepayment: debtData.monthlyRepayment,
    apr: debtData.apr,
    paidOffPercent,
    totalRepaid,
    monthsToPayoff: balanceResult.monthsToPayoff,
    estimatedPayoffDate,
    isPaidOff: balanceResult.isPaidOff,
    loanProgress: balanceResult.loanProgress,
  };
}

// ──────────────────────────────────────────
// Date Helpers
// ──────────────────────────────────────────

/**
 * Calculates the number of whole months between two dates.
 *
 * @param from - Start date
 * @param to   - End date
 * @returns Number of months (always ≥ 0)
 */
export function monthsBetweenDates(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, months);
}

/**
 * Returns the number of days in a given month.
 *
 * @param year  - Full year (e.g. 2025)
 * @param month - Zero-based month (0 = January, 11 = December)
 * @returns Number of days in the month
 */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of the NEXT month gives us the last day of the current month
  return new Date(year, month + 1, 0).getDate();
}
