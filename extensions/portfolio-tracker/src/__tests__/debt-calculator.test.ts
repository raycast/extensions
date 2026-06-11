/**
 * Unit tests for the debt calculator service.
 *
 * Tests cover:
 * - Amortised payment calculation (standard formula + 0% APR edge case)
 * - Monthly balance updates (interest accrual + repayment deduction)
 * - Repayment schedule projection
 * - Loan progress tracking
 * - Repayment counting (day-of-month logic, edge cases)
 * - Current balance calculation with applied repayments
 * - Debt summary builder
 * - Date helper functions
 */

import {
  calculateAmortisedPayment,
  applyMonthlyUpdate,
  projectRepaymentSchedule,
  calculateLoanProgress,
  calculateCurrentDebtBalance,
  countRepaymentsDue,
  buildDebtSummary,
  monthsBetweenDates,
  daysInMonth,
} from "../services/debt-calculator";
import { DebtData } from "../utils/types";

// ──────────────────────────────────────────
// Amortised Payment Calculation
// ──────────────────────────────────────────

describe("calculateAmortisedPayment", () => {
  it("calculates the correct monthly payment for a standard loan", () => {
    // £10,000 loan at 5.5% APR over 60 months
    const payment = calculateAmortisedPayment(10000, 5.5, 60);
    // Expected ~£190.99 (verified against standard amortisation calculators)
    expect(payment).toBeCloseTo(190.99, 0);
  });

  it("calculates simple division for 0% APR loans", () => {
    const payment = calculateAmortisedPayment(5000, 0, 24);
    expect(payment).toBeCloseTo(208.33, 2);
  });

  it("handles a large loan correctly", () => {
    // £250,000 mortgage at 4.5% over 25 years (300 months)
    const payment = calculateAmortisedPayment(250000, 4.5, 300);
    // Expected ~£1,389.58
    expect(payment).toBeCloseTo(1389.58, 0);
  });

  it("returns 0 for zero or negative principal", () => {
    expect(calculateAmortisedPayment(0, 5, 60)).toBe(0);
    expect(calculateAmortisedPayment(-1000, 5, 60)).toBe(0);
  });

  it("returns 0 for zero or negative term", () => {
    expect(calculateAmortisedPayment(10000, 5, 0)).toBe(0);
    expect(calculateAmortisedPayment(10000, 5, -12)).toBe(0);
  });

  it("handles very small loan amounts", () => {
    const payment = calculateAmortisedPayment(100, 10, 12);
    expect(payment).toBeGreaterThan(0);
    // Total paid should be slightly more than £100 due to interest
    expect(payment * 12).toBeGreaterThan(100);
  });

  it("handles high APR correctly", () => {
    // £1,000 at 30% APR over 12 months (payday-level rates)
    const payment = calculateAmortisedPayment(1000, 30, 12);
    expect(payment).toBeGreaterThan(90); // Must cover principal + significant interest
    expect(payment).toBeLessThan(120);
  });
});

// ──────────────────────────────────────────
// Monthly Balance Update
// ──────────────────────────────────────────

describe("applyMonthlyUpdate", () => {
  it("calculates interest and reduces balance correctly", () => {
    // £5,000 at 19.9% APR, £200 monthly repayment
    const result = applyMonthlyUpdate(5000, 19.9, 200);

    // Monthly interest: 5000 * (19.9 / 12 / 100) = ~82.92
    expect(result.interestCharged).toBeCloseTo(82.92, 1);

    // Principal paid: 200 - 82.92 = ~117.08
    expect(result.principalPaid).toBeCloseTo(117.08, 1);

    // New balance: 5000 + 82.92 - 200 = ~4882.92
    expect(result.newBalance).toBeCloseTo(4882.92, 1);
    expect(result.isPaidOff).toBe(false);
  });

  it("handles 0% APR (interest-free)", () => {
    const result = applyMonthlyUpdate(1000, 0, 100);

    expect(result.interestCharged).toBe(0);
    expect(result.principalPaid).toBe(100);
    expect(result.newBalance).toBe(900);
    expect(result.isPaidOff).toBe(false);
  });

  it("handles final payment that clears the debt", () => {
    const result = applyMonthlyUpdate(150, 0, 200);

    expect(result.newBalance).toBe(0);
    expect(result.principalPaid).toBe(150);
    expect(result.isPaidOff).toBe(true);
  });

  it("handles final payment with interest that clears the debt", () => {
    // Balance of £50 at 12% APR, £100 repayment
    // Interest: 50 * (12/12/100) = 0.50
    // Balance with interest: 50.50
    // Repayment of £100 > £50.50 → paid off
    const result = applyMonthlyUpdate(50, 12, 100);

    expect(result.newBalance).toBe(0);
    expect(result.isPaidOff).toBe(true);
    expect(result.interestCharged).toBeCloseTo(0.5, 2);
    expect(result.principalPaid).toBe(50); // all principal repaid
  });

  it("handles zero balance", () => {
    const result = applyMonthlyUpdate(0, 19.9, 200);

    expect(result.newBalance).toBe(0);
    expect(result.interestCharged).toBe(0);
    expect(result.principalPaid).toBe(0);
    expect(result.isPaidOff).toBe(true);
  });

  it("handles repayment less than interest (debt grows)", () => {
    // £10,000 at 24% APR, £100 repayment
    // Monthly interest: 10000 * (24/12/100) = 200
    // Repayment of £100 < £200 interest → debt grows
    const result = applyMonthlyUpdate(10000, 24, 100);

    expect(result.interestCharged).toBe(200);
    expect(result.newBalance).toBe(10100); // grows by £100
    expect(result.principalPaid).toBe(0); // no principal paid
    expect(result.isPaidOff).toBe(false);
  });
});

// ──────────────────────────────────────────
// Repayment Schedule Projection
// ──────────────────────────────────────────

describe("projectRepaymentSchedule", () => {
  it("projects a full schedule for an interest-free loan", () => {
    // £1,200 at 0% APR, £100/month → should pay off in exactly 12 months
    const schedule = projectRepaymentSchedule(1200, 0, 100);

    expect(schedule.length).toBe(12);
    expect(schedule[0].balance).toBe(1100);
    expect(schedule[0].principal).toBe(100);
    expect(schedule[0].interest).toBe(0);
    expect(schedule[11].balance).toBe(0);
    expect(schedule[11].cumulativePrincipal).toBe(1200);
  });

  it("projects a schedule with interest", () => {
    // £5,000 at 10% APR, £500/month
    const schedule = projectRepaymentSchedule(5000, 10, 500);

    // Should pay off in about 11 months
    expect(schedule.length).toBeLessThanOrEqual(12);
    expect(schedule.length).toBeGreaterThanOrEqual(10);

    // Last entry should be paid off
    const last = schedule[schedule.length - 1];
    expect(last.balance).toBe(0);

    // Cumulative interest should be positive
    expect(last.cumulativeInterest).toBeGreaterThan(0);

    // Total paid (principal + interest) should be greater than original balance
    expect(last.cumulativePrincipal + last.cumulativeInterest).toBeGreaterThan(5000);
  });

  it("returns empty array for zero balance", () => {
    const schedule = projectRepaymentSchedule(0, 10, 100);
    expect(schedule).toEqual([]);
  });

  it("returns empty array for zero repayment", () => {
    const schedule = projectRepaymentSchedule(1000, 10, 0);
    expect(schedule).toEqual([]);
  });

  it("respects maxMonths cap", () => {
    // Very small repayment on a large debt — would take very long
    const schedule = projectRepaymentSchedule(100000, 20, 100, 24);

    // Should stop at 24 months even though the debt isn't paid off
    expect(schedule.length).toBe(24);
    expect(schedule[23].balance).toBeGreaterThan(0);
  });

  it("tracks cumulative values correctly", () => {
    const schedule = projectRepaymentSchedule(3000, 6, 300);

    for (let i = 1; i < schedule.length; i++) {
      // Cumulative values should be monotonically increasing
      expect(schedule[i].cumulativeInterest).toBeGreaterThanOrEqual(schedule[i - 1].cumulativeInterest);
      expect(schedule[i].cumulativePrincipal).toBeGreaterThanOrEqual(schedule[i - 1].cumulativePrincipal);
    }
  });

  it("month numbers are sequential starting from 1", () => {
    const schedule = projectRepaymentSchedule(500, 0, 100);

    schedule.forEach((step, index) => {
      expect(step.month).toBe(index + 1);
    });
  });
});

// ──────────────────────────────────────────
// Loan Progress
// ──────────────────────────────────────────

describe("calculateLoanProgress", () => {
  it("calculates progress for a loan at the midpoint", () => {
    // 5-year loan: Jan 2020 → Jan 2025, now = Jan 2023 (3 years in)
    const now = new Date(2023, 0, 15);
    const progress = calculateLoanProgress("2020-01-15", "2025-01-15", now);

    expect(progress.totalMonths).toBe(60);
    expect(progress.monthsElapsed).toBe(36);
    expect(progress.monthsRemaining).toBe(24);
    expect(progress.progressPercent).toBeCloseTo(60, 0);
    expect(progress.isTermComplete).toBe(false);
  });

  it("calculates progress at the start", () => {
    const now = new Date(2022, 0, 15);
    const progress = calculateLoanProgress("2022-01-15", "2027-01-15", now);

    expect(progress.totalMonths).toBe(60);
    expect(progress.monthsElapsed).toBe(0);
    expect(progress.monthsRemaining).toBe(60);
    expect(progress.progressPercent).toBe(0);
    expect(progress.isTermComplete).toBe(false);
  });

  it("calculates progress at completion", () => {
    const now = new Date(2027, 0, 15);
    const progress = calculateLoanProgress("2022-01-15", "2027-01-15", now);

    expect(progress.totalMonths).toBe(60);
    expect(progress.monthsElapsed).toBe(60);
    expect(progress.monthsRemaining).toBe(0);
    expect(progress.progressPercent).toBe(100);
    expect(progress.isTermComplete).toBe(true);
  });

  it("caps progress at 100% when past the end date", () => {
    const now = new Date(2028, 0, 15); // 1 year after end
    const progress = calculateLoanProgress("2022-01-15", "2027-01-15", now);

    expect(progress.progressPercent).toBe(100);
    expect(progress.monthsRemaining).toBe(0);
    expect(progress.isTermComplete).toBe(true);
  });

  it("handles a 1-month term", () => {
    const now = new Date(2025, 1, 1); // Feb 1
    const progress = calculateLoanProgress("2025-01-01", "2025-02-01", now);

    expect(progress.totalMonths).toBe(1);
    expect(progress.monthsElapsed).toBe(1);
    expect(progress.isTermComplete).toBe(true);
  });

  it("handles start date before now (future loan — just started)", () => {
    const now = new Date(2025, 0, 15);
    const progress = calculateLoanProgress("2025-01-15", "2030-01-15", now);

    expect(progress.monthsElapsed).toBe(0);
    expect(progress.progressPercent).toBe(0);
  });
});

// ──────────────────────────────────────────
// Repayment Counting
// ──────────────────────────────────────────

describe("countRepaymentsDue", () => {
  it("counts one repayment when entered today on the repayment day", () => {
    // Entered on Jan 15, repayment day 15, now = Jan 15
    // Entering ON the repayment day means today's repayment is due immediately.
    const now = new Date(2025, 0, 15);
    const count = countRepaymentsDue("2025-01-15T00:00:00Z", 15, now);

    // Today IS the repayment day → 1 repayment due
    expect(count).toBe(1);
  });

  it("counts one repayment when one month has passed", () => {
    // Entered on Jan 10, repayment day 15, now = Feb 16
    const now = new Date(2025, 1, 16);
    const count = countRepaymentsDue("2025-01-10T00:00:00Z", 15, now);

    // Jan 15 was after entry AND before now → should count
    // Feb 15 was also before now → should count
    expect(count).toBe(2);
  });

  it("counts repayments when entered before repayment day in entry month", () => {
    // Entered on Jan 5, repayment day 15, now = Jan 16
    const now = new Date(2025, 0, 16);
    const count = countRepaymentsDue("2025-01-05T00:00:00Z", 15, now);

    // Jan 15 should count (entered before it, and it has passed)
    expect(count).toBe(1);
  });

  it("counts zero when entered after repayment day and same month", () => {
    // Entered on Jan 20, repayment day 15, now = Jan 25
    const now = new Date(2025, 0, 25);
    const count = countRepaymentsDue("2025-01-20T00:00:00Z", 15, now);

    // Jan 15 was before entry → doesn't count. Next is Feb 15 → not yet.
    expect(count).toBe(0);
  });

  it("counts multiple months correctly", () => {
    // Entered on Jan 1, repayment day 1, now = June 2
    const now = new Date(2025, 5, 2); // June 2
    const count = countRepaymentsDue("2025-01-01T00:00:00Z", 1, now);

    // Jan 1 = entry day ON the repayment day → counts (today is the first due date)
    // Feb 1, Mar 1, Apr 1, May 1, Jun 1 = 5 more → total 6
    expect(count).toBe(6);
  });

  it("handles repayment day 31 in months with fewer days", () => {
    // Entered on Jan 1, repayment day 31, now = April 1
    const now = new Date(2025, 3, 1); // April 1

    const count = countRepaymentsDue("2025-01-01T00:00:00Z", 31, now);

    // Jan 31 ✓ (31 days in Jan)
    // Feb 28 ✓ (28 days in Feb 2025 — not a leap year)
    // Mar 31 ✓ (31 days in Mar)
    // April: repayment day would be Apr 30 (30 days in Apr) — not yet passed (now is Apr 1)
    expect(count).toBe(3);
  });

  it("handles repayment day 29 in February on a leap year", () => {
    // Entered Jan 1 2024, repayment day 29, now = March 1 2024
    // 2024 IS a leap year
    const now = new Date(2024, 2, 1); // March 1
    const count = countRepaymentsDue("2024-01-01T00:00:00Z", 29, now);

    // Jan 29 ✓
    // Feb 29 ✓ (leap year, Feb has 29 days)
    expect(count).toBe(2);
  });

  it("handles repayment day 29 in February on a non-leap year", () => {
    // Entered Jan 1 2025, repayment day 29, now = March 1 2025
    // 2025 is NOT a leap year
    const now = new Date(2025, 2, 1); // March 1
    const count = countRepaymentsDue("2025-01-01T00:00:00Z", 29, now);

    // Jan 29 ✓
    // Feb: effective day is 28 (Feb has 28 days in 2025). Mar 1 > Feb 28 → ✓
    expect(count).toBe(2);
  });

  it("returns 0 when now is before the first repayment day", () => {
    const now = new Date(2025, 0, 10); // Jan 10
    const count = countRepaymentsDue("2025-01-05T00:00:00Z", 15, now);

    // First repayment (Jan 15) hasn't arrived yet
    expect(count).toBe(0);
  });

  it("counts correctly across year boundary", () => {
    // Entered Nov 1 2024, repayment day 15, now = Feb 16 2025
    const now = new Date(2025, 1, 16);
    const count = countRepaymentsDue("2024-11-01T00:00:00Z", 15, now);

    // Nov 15 ✓, Dec 15 ✓, Jan 15 ✓, Feb 15 ✓ (now is Feb 16)
    expect(count).toBe(4);
  });

  it("handles entry exactly on repayment day — counts that month", () => {
    // Entered on March 15, repayment day 15, now = April 16
    const now = new Date(2025, 3, 16);
    const count = countRepaymentsDue("2025-03-15T00:00:00Z", 15, now);

    // March 15 = entry day ON the repayment day → counts
    // April 15 ✓ (now is April 16) → counts
    expect(count).toBe(2);
  });
});

// ──────────────────────────────────────────
// Current Balance Calculation
// ──────────────────────────────────────────

describe("calculateCurrentDebtBalance", () => {
  const baseDebtData: DebtData = {
    currentBalance: 5000,
    apr: 12, // 1% per month
    repaymentDayOfMonth: 15,
    monthlyRepayment: 500,
    enteredAt: "2025-01-01T00:00:00Z",
  };

  it("calculates balance with no repayments applied yet (entry date)", () => {
    const now = new Date(2025, 0, 1); // Jan 1
    const result = calculateCurrentDebtBalance(baseDebtData, 0, now);

    expect(result.currentBalance).toBe(5000);
    expect(result.repaymentsApplied).toBe(0);
    expect(result.isPaidOff).toBe(false);
    expect(result.totalInterestAccrued).toBe(0);
    expect(result.totalPrincipalRepaid).toBe(0);
  });

  it("calculates balance after one repayment", () => {
    const now = new Date(2025, 1, 16); // Feb 16 → 2 repayments due (Jan 15, Feb 15)
    // But we pass 0 applied → it should apply 2
    const result = calculateCurrentDebtBalance(baseDebtData, 0, now);

    expect(result.repaymentsApplied).toBe(2);
    expect(result.currentBalance).toBeLessThan(5000);
    expect(result.totalInterestAccrued).toBeGreaterThan(0);
    expect(result.totalPrincipalRepaid).toBeGreaterThan(0);
    expect(result.isPaidOff).toBe(false);
  });

  it("does not double-apply already-applied repayments", () => {
    const now = new Date(2025, 1, 16); // Feb 16 → 2 due
    const result1 = calculateCurrentDebtBalance(baseDebtData, 0, now);
    const result2 = calculateCurrentDebtBalance(baseDebtData, 2, now);

    // Both should produce the same balance
    expect(result1.currentBalance).toBeCloseTo(result2.currentBalance, 2);
    expect(result1.repaymentsApplied).toBe(result2.repaymentsApplied);
  });

  it("detects paid-off state", () => {
    // Small debt that should be paid off quickly
    const smallDebt: DebtData = {
      currentBalance: 100,
      apr: 0,
      repaymentDayOfMonth: 1,
      monthlyRepayment: 50,
      enteredAt: "2025-01-01T00:00:00Z",
    };

    const now = new Date(2025, 3, 2); // April 2 → 3 repayments due (Feb 1, Mar 1, Apr 1)
    const result = calculateCurrentDebtBalance(smallDebt, 0, now);

    expect(result.isPaidOff).toBe(true);
    expect(result.currentBalance).toBe(0);
  });

  it("calculates months to payoff", () => {
    const now = new Date(2025, 0, 1);
    const result = calculateCurrentDebtBalance(baseDebtData, 0, now);

    expect(result.monthsToPayoff).not.toBeNull();
    expect(result.monthsToPayoff!).toBeGreaterThan(0);
    expect(result.monthsToPayoff!).toBeLessThan(20); // £5000 at £500/mo with 12% APR
  });

  it("includes loan progress for loans with start/end dates", () => {
    const loanDebt: DebtData = {
      ...baseDebtData,
      loanStartDate: "2024-01-15",
      loanEndDate: "2029-01-15",
    };

    const now = new Date(2025, 0, 15);
    const result = calculateCurrentDebtBalance(loanDebt, 0, now);

    expect(result.loanProgress).not.toBeNull();
    expect(result.loanProgress!.totalMonths).toBe(60);
    expect(result.loanProgress!.monthsElapsed).toBe(12);
  });

  it("returns null loan progress for debts without dates", () => {
    const now = new Date(2025, 0, 1);
    const result = calculateCurrentDebtBalance(baseDebtData, 0, now);

    expect(result.loanProgress).toBeNull();
  });
});

// ──────────────────────────────────────────
// Debt Summary
// ──────────────────────────────────────────

describe("buildDebtSummary", () => {
  it("builds a summary for an active debt", () => {
    const debtData: DebtData = {
      currentBalance: 3000,
      apr: 15,
      repaymentDayOfMonth: 1,
      monthlyRepayment: 300,
      enteredAt: "2025-01-02T00:00:00Z", // entered AFTER repayment day → 0 repayments yet due
    };

    const now = new Date(2025, 0, 2); // Jan 2 — next repayment (Feb 1) not yet reached
    const summary = buildDebtSummary(debtData, 0, now);

    expect(summary.balance).toBe(3000);
    expect(summary.monthlyRepayment).toBe(300);
    expect(summary.apr).toBe(15);
    expect(summary.isPaidOff).toBe(false);
    expect(summary.monthsToPayoff).toBeGreaterThan(0);
    expect(summary.estimatedPayoffDate).not.toBeNull();
  });

  it("builds a summary for a paid-off debt", () => {
    const debtData: DebtData = {
      currentBalance: 100,
      apr: 0,
      repaymentDayOfMonth: 1,
      monthlyRepayment: 100,
      enteredAt: "2025-01-01T00:00:00Z",
    };

    // After 1 repayment (Feb 1), it should be paid off
    const now = new Date(2025, 1, 2);
    const summary = buildDebtSummary(debtData, 0, now);

    expect(summary.isPaidOff).toBe(true);
    expect(summary.balance).toBe(0);
    expect(summary.paidOffPercent).toBe(100);
  });

  it("calculates paid-off percentage correctly", () => {
    const debtData: DebtData = {
      currentBalance: 1000,
      apr: 0,
      repaymentDayOfMonth: 15,
      monthlyRepayment: 200,
      enteredAt: "2025-01-01T00:00:00Z",
    };

    // 2 repayments applied (£400 of £1000)
    const now = new Date(2025, 2, 16); // March 16 → 3 due (Jan 15, Feb 15, Mar 15)
    const summary = buildDebtSummary(debtData, 0, now);

    expect(summary.paidOffPercent).toBeCloseTo(60, 0); // 3 × £200 = £600 of £1000
  });

  it("includes estimated payoff date", () => {
    const debtData: DebtData = {
      currentBalance: 2400,
      apr: 0,
      repaymentDayOfMonth: 1,
      monthlyRepayment: 200,
      enteredAt: "2025-01-02T00:00:00Z", // entered AFTER repayment day → 0 repayments yet due
    };

    const now = new Date(2025, 0, 2); // Jan 2 — next repayment (Feb 1) not yet reached
    const summary = buildDebtSummary(debtData, 0, now);

    expect(summary.estimatedPayoffDate).not.toBeNull();
    // 2400 / 200 = 12 months (no repayment applied yet)
    expect(summary.monthsToPayoff).toBe(12);
  });

  it("includes loan progress when applicable", () => {
    const debtData: DebtData = {
      currentBalance: 10000,
      apr: 5,
      repaymentDayOfMonth: 1,
      monthlyRepayment: 200,
      enteredAt: "2023-01-01T00:00:00Z",
      loanStartDate: "2023-01-01",
      loanEndDate: "2028-01-01",
    };

    const now = new Date(2025, 0, 1);
    const summary = buildDebtSummary(debtData, 0, now);

    expect(summary.loanProgress).not.toBeNull();
    expect(summary.loanProgress!.totalMonths).toBe(60);
    expect(summary.loanProgress!.monthsElapsed).toBe(24);
  });
});

// ──────────────────────────────────────────
// Date Helpers
// ──────────────────────────────────────────

describe("monthsBetweenDates", () => {
  it("calculates months between two dates in the same year", () => {
    const from = new Date(2025, 0, 1); // January
    const to = new Date(2025, 5, 1); // June
    expect(monthsBetweenDates(from, to)).toBe(5);
  });

  it("calculates months across year boundaries", () => {
    const from = new Date(2024, 10, 1); // November 2024
    const to = new Date(2025, 2, 1); // March 2025
    expect(monthsBetweenDates(from, to)).toBe(4);
  });

  it("returns 0 for same month", () => {
    const from = new Date(2025, 3, 1);
    const to = new Date(2025, 3, 28);
    expect(monthsBetweenDates(from, to)).toBe(0);
  });

  it("returns 0 when from is after to", () => {
    const from = new Date(2025, 6, 1);
    const to = new Date(2025, 3, 1);
    expect(monthsBetweenDates(from, to)).toBe(0);
  });

  it("calculates exactly 12 months for a full year", () => {
    const from = new Date(2024, 0, 1);
    const to = new Date(2025, 0, 1);
    expect(monthsBetweenDates(from, to)).toBe(12);
  });

  it("calculates multi-year spans", () => {
    const from = new Date(2020, 0, 1);
    const to = new Date(2025, 6, 1); // 5 years + 6 months
    expect(monthsBetweenDates(from, to)).toBe(66);
  });
});

describe("daysInMonth", () => {
  it("returns 31 for January", () => {
    expect(daysInMonth(2025, 0)).toBe(31);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(daysInMonth(2025, 1)).toBe(28);
  });

  it("returns 29 for February in a leap year", () => {
    expect(daysInMonth(2024, 1)).toBe(29);
  });

  it("returns 30 for April", () => {
    expect(daysInMonth(2025, 3)).toBe(30);
  });

  it("returns 31 for December", () => {
    expect(daysInMonth(2025, 11)).toBe(31);
  });

  it("returns 30 for June", () => {
    expect(daysInMonth(2025, 5)).toBe(30);
  });
});

// ──────────────────────────────────────────
// Integration-style Tests
// ──────────────────────────────────────────

describe("end-to-end debt scenarios", () => {
  it("credit card: £5,000 at 19.9% APR, £200/month", () => {
    const schedule = projectRepaymentSchedule(5000, 19.9, 200);

    // Should take about 32–33 months to pay off
    expect(schedule.length).toBeGreaterThanOrEqual(30);
    expect(schedule.length).toBeLessThanOrEqual(35);

    // Last step should be paid off
    const last = schedule[schedule.length - 1];
    expect(last.balance).toBe(0);

    // Total interest should be significant at 19.9% APR
    expect(last.cumulativeInterest).toBeGreaterThan(1000);

    // Total cost (principal + interest) should be substantial
    const totalCost = last.cumulativePrincipal + last.cumulativeInterest;
    expect(totalCost).toBeGreaterThan(5000);
  });

  it("BNPL: £600 at 0% APR, £100/month → exactly 6 months", () => {
    const schedule = projectRepaymentSchedule(600, 0, 100);

    expect(schedule.length).toBe(6);
    expect(schedule[5].balance).toBe(0);
    expect(schedule[5].cumulativeInterest).toBe(0);
    expect(schedule[5].cumulativePrincipal).toBe(600);
  });

  it("student loan: £30,000 at 6.5% over 20 years", () => {
    const totalMonths = 240; // 20 years
    const payment = calculateAmortisedPayment(30000, 6.5, totalMonths);

    // Expected around £223/month
    expect(payment).toBeGreaterThan(200);
    expect(payment).toBeLessThan(250);

    // Verify the schedule pays it off in 240 months
    const schedule = projectRepaymentSchedule(30000, 6.5, payment);
    expect(schedule.length).toBeLessThanOrEqual(totalMonths + 1); // rounding tolerance

    const last = schedule[schedule.length - 1];
    expect(last.balance).toBe(0);

    // Total interest on a student loan is substantial
    expect(last.cumulativeInterest).toBeGreaterThan(20000);
  });

  it("auto loan: £15,000 at 3.9% over 5 years", () => {
    const totalMonths = 60;
    const payment = calculateAmortisedPayment(15000, 3.9, totalMonths);

    // Expected around £275/month
    expect(payment).toBeGreaterThan(260);
    expect(payment).toBeLessThan(290);

    const schedule = projectRepaymentSchedule(15000, 3.9, payment);
    expect(schedule.length).toBeLessThanOrEqual(totalMonths + 1);

    const last = schedule[schedule.length - 1];
    expect(last.balance).toBe(0);

    // Total interest on a 3.9% auto loan should be moderate
    expect(last.cumulativeInterest).toBeGreaterThan(1000);
    expect(last.cumulativeInterest).toBeLessThan(4000);
  });

  it("loan progress matches schedule length", () => {
    const startDate = "2023-01-01";
    const endDate = "2028-01-01"; // 5 years
    const now = new Date(2025, 6, 1); // 2.5 years in

    const progress = calculateLoanProgress(startDate, endDate, now);

    expect(progress.totalMonths).toBe(60);
    expect(progress.monthsElapsed).toBe(30);
    expect(progress.progressPercent).toBeCloseTo(50, 0);
  });
});
