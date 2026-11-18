/**
 * Tests for the mortgage calculator service.
 *
 * Covers:
 * - Monthly payment calculation (standard amortization formula)
 * - Month-by-month principal/interest breakdown
 * - Cumulative principal repayment between dates
 * - Current equity calculation (original equity + principal + appreciation)
 * - Shared ownership and myEquityShare adjustments
 * - Principal/interest ratio at a given point in time
 * - Real-life example validation
 *
 * All functions are pure math — no mocks needed.
 */

import {
  calculateMonthlyPayment,
  calculateMonthBreakdown,
  calculateCumulativePrincipal,
  calculateCurrentEquity,
  getCurrentPrincipalInterestRatio,
} from "../services/mortgage-calculator";
import { MortgageData } from "../utils/types";

// ──────────────────────────────────────────
// calculateMonthlyPayment
// ──────────────────────────────────────────

describe("calculateMonthlyPayment", () => {
  it("calculates a standard 25-year mortgage at 4.5%", () => {
    const payment = calculateMonthlyPayment(250000, 4.5, 25);
    // Expected ~£1,389.58 per month
    expect(payment).toBeCloseTo(1389.58, 0);
  });

  it("calculates a 30-year mortgage at 3.5%", () => {
    const payment = calculateMonthlyPayment(300000, 3.5, 30);
    // Expected ~£1,347.13 per month
    expect(payment).toBeCloseTo(1347.13, 0);
  });

  it("calculates a short 10-year mortgage at 5%", () => {
    const payment = calculateMonthlyPayment(200000, 5, 10);
    // Expected ~£2,121.31 per month
    expect(payment).toBeCloseTo(2121.31, 0);
  });

  it("returns 0 for zero principal", () => {
    expect(calculateMonthlyPayment(0, 4.5, 25)).toBe(0);
  });

  it("returns 0 for negative principal", () => {
    expect(calculateMonthlyPayment(-100000, 4.5, 25)).toBe(0);
  });

  it("returns 0 for zero term", () => {
    expect(calculateMonthlyPayment(250000, 4.5, 0)).toBe(0);
  });

  it("returns 0 for negative term", () => {
    expect(calculateMonthlyPayment(250000, 4.5, -5)).toBe(0);
  });

  it("handles 0% interest rate (simple division)", () => {
    const payment = calculateMonthlyPayment(120000, 0, 10);
    // 120000 / (10 * 12) = 1000
    expect(payment).toBe(1000);
  });

  it("handles very high interest rate", () => {
    const payment = calculateMonthlyPayment(100000, 20, 25);
    expect(payment).toBeGreaterThan(0);
    expect(isFinite(payment)).toBe(true);
  });

  it("handles very small principal", () => {
    const payment = calculateMonthlyPayment(100, 4.5, 25);
    expect(payment).toBeGreaterThan(0);
    expect(payment).toBeLessThan(1);
  });

  it("total payments exceed principal due to interest", () => {
    const payment = calculateMonthlyPayment(250000, 4.5, 25);
    const totalPaid = payment * 25 * 12;
    expect(totalPaid).toBeGreaterThan(250000);
  });

  it("total payments equal principal when rate is 0%", () => {
    const payment = calculateMonthlyPayment(120000, 0, 10);
    const totalPaid = payment * 10 * 12;
    expect(totalPaid).toBeCloseTo(120000, 2);
  });
});

// ──────────────────────────────────────────
// calculateMonthBreakdown
// ──────────────────────────────────────────

describe("calculateMonthBreakdown", () => {
  const principal = 250000;
  const rate = 4.5;
  const term = 25;

  it("returns correct values for month 1", () => {
    const m1 = calculateMonthBreakdown(principal, rate, term, 1);
    expect(m1.monthNumber).toBe(1);
    expect(m1.payment).toBeCloseTo(1389.58, 0);
    // Month 1 interest: 250000 * (4.5/100/12) = 937.50
    expect(m1.interest).toBeCloseTo(937.5, 0);
    // Month 1 principal: payment - interest
    expect(m1.principal).toBeCloseTo(1389.58 - 937.5, 0);
    expect(m1.remainingBalance).toBeCloseTo(principal - m1.principal, 0);
  });

  it("month 1 is interest-heavy (interest > principal)", () => {
    const m1 = calculateMonthBreakdown(principal, rate, term, 1);
    expect(m1.interest).toBeGreaterThan(m1.principal);
  });

  it("last month is principal-heavy (principal > interest)", () => {
    const totalMonths = term * 12;
    const mLast = calculateMonthBreakdown(principal, rate, term, totalMonths);
    expect(mLast.principal).toBeGreaterThan(mLast.interest);
  });

  it("last month has near-zero remaining balance", () => {
    const totalMonths = term * 12;
    const mLast = calculateMonthBreakdown(principal, rate, term, totalMonths);
    expect(mLast.remainingBalance).toBeCloseTo(0, 0);
  });

  it("principal + interest equals the monthly payment for any month", () => {
    for (const monthNum of [1, 50, 100, 200, 300]) {
      const breakdown = calculateMonthBreakdown(principal, rate, term, monthNum);
      expect(breakdown.principal + breakdown.interest).toBeCloseTo(breakdown.payment, 2);
    }
  });

  it("principal portion increases over time", () => {
    const m1 = calculateMonthBreakdown(principal, rate, term, 1);
    const m100 = calculateMonthBreakdown(principal, rate, term, 100);
    const m200 = calculateMonthBreakdown(principal, rate, term, 200);
    expect(m100.principal).toBeGreaterThan(m1.principal);
    expect(m200.principal).toBeGreaterThan(m100.principal);
  });

  it("interest portion decreases over time", () => {
    const m1 = calculateMonthBreakdown(principal, rate, term, 1);
    const m100 = calculateMonthBreakdown(principal, rate, term, 100);
    const m200 = calculateMonthBreakdown(principal, rate, term, 200);
    expect(m100.interest).toBeLessThan(m1.interest);
    expect(m200.interest).toBeLessThan(m100.interest);
  });

  it("remaining balance decreases over time", () => {
    const m1 = calculateMonthBreakdown(principal, rate, term, 1);
    const m100 = calculateMonthBreakdown(principal, rate, term, 100);
    const m200 = calculateMonthBreakdown(principal, rate, term, 200);
    expect(m100.remainingBalance).toBeLessThan(m1.remainingBalance);
    expect(m200.remainingBalance).toBeLessThan(m100.remainingBalance);
  });

  it("returns zeros for month 0 (invalid)", () => {
    const m0 = calculateMonthBreakdown(principal, rate, term, 0);
    expect(m0.payment).toBe(0);
    expect(m0.principal).toBe(0);
    expect(m0.interest).toBe(0);
    expect(m0.remainingBalance).toBe(principal);
  });

  it("returns zeros for month beyond term", () => {
    const totalMonths = term * 12;
    const mBeyond = calculateMonthBreakdown(principal, rate, term, totalMonths + 1);
    expect(mBeyond.payment).toBe(0);
    expect(mBeyond.principal).toBe(0);
    expect(mBeyond.interest).toBe(0);
    expect(mBeyond.remainingBalance).toBe(0);
  });

  it("returns zeros for zero principal", () => {
    const m = calculateMonthBreakdown(0, rate, term, 1);
    expect(m.payment).toBe(0);
    expect(m.principal).toBe(0);
    expect(m.interest).toBe(0);
  });

  it("handles 0% interest correctly", () => {
    const m = calculateMonthBreakdown(120000, 0, 10, 1);
    expect(m.payment).toBe(1000);
    expect(m.principal).toBe(1000);
    expect(m.interest).toBe(0);
    expect(m.remainingBalance).toBeCloseTo(119000, 0);
  });

  it("handles 0% interest — remaining balance decreases linearly", () => {
    const m1 = calculateMonthBreakdown(120000, 0, 10, 1);
    const m60 = calculateMonthBreakdown(120000, 0, 10, 60);
    const m120 = calculateMonthBreakdown(120000, 0, 10, 120);
    expect(m1.remainingBalance).toBeCloseTo(119000, 0);
    expect(m60.remainingBalance).toBeCloseTo(60000, 0);
    expect(m120.remainingBalance).toBeCloseTo(0, 0);
  });
});

// ──────────────────────────────────────────
// calculateCumulativePrincipal
// ──────────────────────────────────────────

describe("calculateCumulativePrincipal", () => {
  it("calculates principal repaid over 12 months from the start", () => {
    const principal = 250000;
    const rate = 4.5;
    const term = 25;
    const startDate = "2020-01-01";
    const fromDate = "2020-01-01";
    const toDate = "2020-12-01";

    const cumPrincipal = calculateCumulativePrincipal(principal, rate, term, startDate, fromDate, toDate);

    // Should be roughly 12 months of principal at the start
    // Month 1 principal ≈ 452, increasing slightly each month
    expect(cumPrincipal).toBeGreaterThan(5000);
    expect(cumPrincipal).toBeLessThan(7000);
  });

  it("calculates principal repaid later in the mortgage (higher principal portion)", () => {
    const principal = 250000;
    const rate = 4.5;
    const term = 25;
    const startDate = "2000-01-01";
    const fromDate = "2020-01-01"; // 20 years in
    const toDate = "2020-12-01"; // 12 months later

    const cumPrincipal = calculateCumulativePrincipal(principal, rate, term, startDate, fromDate, toDate);

    // Later in the mortgage, more goes to principal
    const earlyPrincipal = calculateCumulativePrincipal(principal, rate, term, startDate, "2000-01-01", "2000-12-01");
    expect(cumPrincipal).toBeGreaterThan(earlyPrincipal);
  });

  it("returns 0 for zero principal", () => {
    expect(calculateCumulativePrincipal(0, 4.5, 25, "2020-01-01", "2020-01-01", "2020-12-01")).toBe(0);
  });

  it("returns 0 for zero term", () => {
    expect(calculateCumulativePrincipal(250000, 4.5, 0, "2020-01-01", "2020-01-01", "2020-12-01")).toBe(0);
  });

  it("returns 0 for invalid dates", () => {
    expect(calculateCumulativePrincipal(250000, 4.5, 25, "invalid", "2020-01-01", "2020-12-01")).toBe(0);
  });

  it("returns 0 when fromDate is after toDate", () => {
    expect(calculateCumulativePrincipal(250000, 4.5, 25, "2020-01-01", "2022-01-01", "2021-01-01")).toBe(0);
  });

  it("returns a positive value when from and to are in the same month", () => {
    const result = calculateCumulativePrincipal(250000, 4.5, 25, "2020-01-01", "2020-06-01", "2020-06-15");
    // Same month = 1 month of principal
    expect(result).toBeGreaterThan(0);
  });

  it("handles 0% interest (all payment goes to principal)", () => {
    const result = calculateCumulativePrincipal(120000, 0, 10, "2020-01-01", "2020-01-01", "2020-12-01");
    // 12 months * 1000/month = 12000
    expect(result).toBeCloseTo(12000, 0);
  });

  it("total principal repaid over full term equals the original principal", () => {
    const principal = 250000;
    const rate = 4.5;
    const term = 25;
    const startDate = "2000-01-01";
    const endDate = "2024-12-01"; // 25 years = 300 months

    const total = calculateCumulativePrincipal(principal, rate, term, startDate, startDate, endDate);
    expect(total).toBeCloseTo(principal, -2); // within £100
  });

  it("clamps to valid month range when dates extend beyond term", () => {
    const principal = 100000;
    const rate = 5;
    const term = 5; // 60 months

    // From before mortgage start to after mortgage end
    const total = calculateCumulativePrincipal(principal, rate, term, "2020-01-01", "2019-01-01", "2030-01-01");
    expect(total).toBeCloseTo(principal, -2);
  });
});

// ──────────────────────────────────────────
// calculateCurrentEquity
// ──────────────────────────────────────────

describe("calculateCurrentEquity", () => {
  describe("owned outright (equity = total value)", () => {
    const ownedData: MortgageData = {
      totalPropertyValue: 500000,
      equity: 500000,
      valuationDate: "2023-01-01",
      postcode: "SW1A 1AA",
    };

    it("returns full property value as equity when no HPI change", () => {
      const result = calculateCurrentEquity(ownedData, 0);
      expect(result.currentEquity).toBe(500000);
      expect(result.adjustedEquity).toBe(500000);
      expect(result.adjustedOriginalEquity).toBe(500000);
      expect(result.currentPropertyValue).toBe(500000);
      expect(result.outstandingBalance).toBe(0);
      expect(result.principalRepaid).toBe(0);
    });

    it("applies positive HPI appreciation to fully owned property", () => {
      const result = calculateCurrentEquity(ownedData, 5);
      // 500000 * 1.05 = 525000
      expect(result.currentPropertyValue).toBeCloseTo(525000, 0);
      expect(result.currentEquity).toBeCloseTo(525000, 0);
      expect(result.adjustedEquity).toBeCloseTo(525000, 0);
    });

    it("applies negative HPI depreciation", () => {
      const result = calculateCurrentEquity(ownedData, -3);
      // 500000 * 0.97 = 485000
      expect(result.currentPropertyValue).toBeCloseTo(485000, 0);
      expect(result.currentEquity).toBeCloseTo(485000, 0);
      expect(result.adjustedEquity).toBeCloseTo(485000, 0);
    });
  });

  describe("mortgage without repayment data", () => {
    const mortgageData: MortgageData = {
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-06-01",
      postcode: "M1 1AA",
    };

    it("returns original equity when no HPI change and no repayment data", () => {
      const result = calculateCurrentEquity(mortgageData, 0);
      expect(result.currentEquity).toBe(100000);
      expect(result.adjustedEquity).toBe(100000);
      expect(result.adjustedOriginalEquity).toBe(100000);
      expect(result.originalEquity).toBe(100000);
      expect(result.principalRepaid).toBe(0);
      expect(result.netChange).toBe(0);
      expect(result.outstandingBalance).toBe(250000);
      expect(result.sharedOwnershipPercent).toBe(100);
      expect(result.myEquityShare).toBe(0);
    });

    it("increases equity with positive HPI change", () => {
      const result = calculateCurrentEquity(mortgageData, 4.2);
      // Property value: 350000 * 1.042 = 364700
      // Outstanding: 250000 (unchanged — no repayment data)
      // Equity: 364700 - 250000 = 114700
      expect(result.currentPropertyValue).toBeCloseTo(364700, 0);
      expect(result.currentEquity).toBeCloseTo(114700, 0);
      expect(result.adjustedEquity).toBeCloseTo(114700, 0);
      expect(result.appreciation).toBeCloseTo(14700, 0);
    });

    it("decreases equity with negative HPI change", () => {
      const result = calculateCurrentEquity(mortgageData, -5);
      // Property value: 350000 * 0.95 = 332500
      // Outstanding: 250000
      // Equity: 332500 - 250000 = 82500
      expect(result.currentPropertyValue).toBeCloseTo(332500, 0);
      expect(result.currentEquity).toBeCloseTo(82500, 0);
    });

    it("equity can go below original with large depreciation", () => {
      const result = calculateCurrentEquity(mortgageData, -30);
      // Property value: 350000 * 0.7 = 245000
      // Outstanding: 250000
      // Equity: 245000 - 250000 = -5000 (negative equity)
      expect(result.currentEquity).toBeLessThan(0);
    });

    it("returns correct HPI change percent in result", () => {
      const result = calculateCurrentEquity(mortgageData, 7.3);
      expect(result.hpiChangePercent).toBe(7.3);
    });
  });

  describe("mortgage with repayment data", () => {
    const mortgageDataWithRepayment: MortgageData = {
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-06-01",
      postcode: "M1 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2023-01-01",
    };

    it("includes principal repayment in equity calculation", () => {
      // Calculate as of roughly 2 years later
      const result = calculateCurrentEquity(mortgageDataWithRepayment, 0, "2025-06-01");
      // With 0% HPI, equity should be original + principal repaid
      expect(result.principalRepaid).toBeGreaterThan(0);
      expect(result.currentEquity).toBeGreaterThan(100000);
      expect(result.currentEquity).toBeCloseTo(100000 + result.principalRepaid, 0);
    });

    it("combines principal repayment with HPI appreciation", () => {
      const result = calculateCurrentEquity(mortgageDataWithRepayment, 5, "2025-06-01");
      // Equity = original + principal_repaid + appreciation
      const expectedEquity = result.originalEquity + result.principalRepaid + result.appreciation;
      // Actually currentEquity = currentPropertyValue - outstandingBalance
      // which is equivalent
      expect(result.currentEquity).toBeCloseTo(expectedEquity, 0);
    });

    it("outstanding balance decreases with principal repayment", () => {
      const result = calculateCurrentEquity(mortgageDataWithRepayment, 0, "2025-06-01");
      const originalOutstanding = 350000 - 100000;
      expect(result.outstandingBalance).toBeLessThan(originalOutstanding);
      expect(result.outstandingBalance).toBeCloseTo(originalOutstanding - result.principalRepaid, 0);
    });

    it("outstanding balance is never negative", () => {
      // Even with extreme principal repayment scenarios
      const result = calculateCurrentEquity(mortgageDataWithRepayment, 0, "2060-01-01");
      expect(result.outstandingBalance).toBeGreaterThanOrEqual(0);
    });
  });

  describe("edge cases", () => {
    it("handles zero total property value", () => {
      const data: MortgageData = {
        totalPropertyValue: 0,
        equity: 0,
        valuationDate: "2023-01-01",
        postcode: "SW1A 1AA",
      };
      const result = calculateCurrentEquity(data, 5);
      expect(result.currentEquity).toBe(0);
      expect(result.currentPropertyValue).toBe(0);
    });

    it("handles equity equal to total value (no outstanding mortgage)", () => {
      const data: MortgageData = {
        totalPropertyValue: 300000,
        equity: 300000,
        valuationDate: "2023-01-01",
        postcode: "SW1A 1AA",
        mortgageRate: 4.5,
        mortgageTerm: 25,
        mortgageStartDate: "2020-01-01",
      };
      const result = calculateCurrentEquity(data, 3);
      // No outstanding balance, so no principal to repay
      expect(result.outstandingBalance).toBe(0);
      expect(result.principalRepaid).toBe(0);
      // Equity = property value (fully owned)
      expect(result.currentEquity).toBeCloseTo(309000, 0);
    });

    it("handles 100% HPI increase", () => {
      const data: MortgageData = {
        totalPropertyValue: 200000,
        equity: 50000,
        valuationDate: "2020-01-01",
        postcode: "E1 1AA",
      };
      const result = calculateCurrentEquity(data, 100);
      expect(result.currentPropertyValue).toBeCloseTo(400000, 0);
      // Outstanding stays 150000
      expect(result.currentEquity).toBeCloseTo(250000, 0);
      expect(result.adjustedEquity).toBeCloseTo(250000, 0);
    });
  });

  // ────────────────────────────────────────
  // Shared Ownership & My Equity Share
  // ────────────────────────────────────────

  describe("shared ownership (no myEquityShare)", () => {
    it("splits full equity by ownership percentage when no myEquityShare", () => {
      const data: MortgageData = {
        totalPropertyValue: 500000,
        equity: 200000,
        valuationDate: "2023-01-01",
        postcode: "SW1A 1AA",
        sharedOwnershipPercent: 50,
      };
      const result = calculateCurrentEquity(data, 0);
      // No HPI → netChange = 0, full equity = 200000
      // No myEquityShare → split full equity: 200000 * 50/100 = 100000
      expect(result.currentEquity).toBe(200000);
      expect(result.adjustedEquity).toBe(100000);
      expect(result.adjustedOriginalEquity).toBe(100000);
      expect(result.netChange).toBe(0);
      expect(result.sharedOwnershipPercent).toBe(50);
      expect(result.myEquityShare).toBe(0);
    });

    it("splits equity with HPI appreciation when no myEquityShare", () => {
      const data: MortgageData = {
        totalPropertyValue: 500000,
        equity: 200000,
        valuationDate: "2023-01-01",
        postcode: "SW1A 1AA",
        sharedOwnershipPercent: 50,
      };
      const result = calculateCurrentEquity(data, 5);
      // Property value: 500000 * 1.05 = 525000
      // Outstanding: 300000
      // Full equity: 525000 - 300000 = 225000
      // No myEquityShare → split full equity: 225000 * 50/100 = 112500
      // adjustedOriginalEquity: 200000 * 50/100 = 100000
      expect(result.currentEquity).toBeCloseTo(225000, 0);
      expect(result.adjustedEquity).toBeCloseTo(112500, 0);
      expect(result.adjustedOriginalEquity).toBe(100000);
      // Equity change % = (112500 - 100000) / 100000 = 12.5%
      const equityChangePct =
        ((result.adjustedEquity - result.adjustedOriginalEquity) / result.adjustedOriginalEquity) * 100;
      expect(equityChangePct).toBeCloseTo(12.5, 1);
    });

    it("treats 100% ownership same as no shared ownership", () => {
      const data: MortgageData = {
        totalPropertyValue: 350000,
        equity: 100000,
        valuationDate: "2023-01-01",
        postcode: "M1 1AA",
        sharedOwnershipPercent: 100,
      };
      const result = calculateCurrentEquity(data, 4.2);
      expect(result.currentEquity).toBeCloseTo(result.adjustedEquity, 0);
      expect(result.adjustedOriginalEquity).toBe(result.originalEquity);
      expect(result.sharedOwnershipPercent).toBe(100);
    });

    it("treats undefined ownership same as 100%", () => {
      const data: MortgageData = {
        totalPropertyValue: 350000,
        equity: 100000,
        valuationDate: "2023-01-01",
        postcode: "M1 1AA",
      };
      const result = calculateCurrentEquity(data, 4.2);
      expect(result.currentEquity).toBeCloseTo(result.adjustedEquity, 0);
      expect(result.adjustedOriginalEquity).toBe(result.originalEquity);
      expect(result.sharedOwnershipPercent).toBe(100);
    });
  });

  describe("myEquityShare with shared ownership", () => {
    it("applies net-change formula: myShare + netChange × SO%", () => {
      const data: MortgageData = {
        totalPropertyValue: 500000,
        equity: 200000,
        valuationDate: "2023-01-01",
        postcode: "SW1A 1AA",
        sharedOwnershipPercent: 50,
        myEquityShare: 130000,
      };
      const result = calculateCurrentEquity(data, 0);
      // netChange = 0 (no HPI, no principal)
      // adjustedEquity = 130000 + (0 * 50/100) = 130000
      // adjustedOriginalEquity = 130000
      expect(result.currentEquity).toBe(200000);
      expect(result.netChange).toBe(0);
      expect(result.adjustedEquity).toBe(130000);
      expect(result.adjustedOriginalEquity).toBe(130000);
      expect(result.sharedOwnershipPercent).toBe(50);
      expect(result.myEquityShare).toBe(130000);
    });

    it("splits only the net change, not the original equity", () => {
      const data: MortgageData = {
        totalPropertyValue: 500000,
        equity: 200000,
        valuationDate: "2023-01-01",
        postcode: "SW1A 1AA",
        sharedOwnershipPercent: 50,
        myEquityShare: 130000,
      };
      const result = calculateCurrentEquity(data, 10);
      // Property value: 500000 * 1.10 = 550000
      // Outstanding: 300000
      // Full equity: 550000 - 300000 = 250000
      // appreciation: 50000
      // netChange = 0 (principal) + 50000 (appreciation) = 50000
      // adjustedEquity = 130000 + (50000 * 50/100) = 130000 + 25000 = 155000
      // adjustedOriginalEquity = 130000
      expect(result.currentEquity).toBeCloseTo(250000, 0);
      expect(result.netChange).toBeCloseTo(50000, 0);
      expect(result.adjustedEquity).toBeCloseTo(155000, 0);
      expect(result.adjustedOriginalEquity).toBe(130000);
      // Equity change % = (155000 - 130000) / 130000 ≈ 19.23%
      const equityChangePct =
        ((result.adjustedEquity - result.adjustedOriginalEquity) / result.adjustedOriginalEquity) * 100;
      expect(equityChangePct).toBeCloseTo(19.23, 1);
    });

    it("myEquityShare without shared ownership uses full equity (100%)", () => {
      const data: MortgageData = {
        totalPropertyValue: 350000,
        equity: 100000,
        valuationDate: "2023-01-01",
        postcode: "M1 1AA",
        myEquityShare: 80000,
      };
      const result = calculateCurrentEquity(data, 0);
      // 100% ownership, myEquityShare = 80000
      // netChange = 0
      // adjustedEquity = 80000 + (0 * 100/100) = 80000
      // Wait — with 100% ownership and no SO configured, fast path: adjustedEquity = currentEquity = 100000
      // myEquityShare only matters when sharedOwnershipPercent < 100
      expect(result.currentEquity).toBe(100000);
      expect(result.adjustedEquity).toBe(100000);
      expect(result.adjustedOriginalEquity).toBe(100000);
    });

    it("handles negative net change with shared ownership", () => {
      const data: MortgageData = {
        totalPropertyValue: 300000,
        equity: 50000,
        valuationDate: "2023-01-01",
        postcode: "SW1A 1AA",
        sharedOwnershipPercent: 50,
        myEquityShare: 30000,
      };
      const result = calculateCurrentEquity(data, -25);
      // Property value: 300000 * 0.75 = 225000
      // Outstanding: 250000
      // Full equity: 225000 - 250000 = -25000 (negative equity)
      // appreciation = -75000
      // netChange = 0 + (-75000) = -75000
      // adjustedEquity = 30000 + (-75000 * 50/100) = 30000 - 37500 = -7500
      // adjustedOriginalEquity = 30000
      expect(result.currentEquity).toBeCloseTo(-25000, 0);
      expect(result.netChange).toBeCloseTo(-75000, 0);
      expect(result.adjustedEquity).toBeCloseTo(-7500, 0);
      expect(result.adjustedOriginalEquity).toBe(30000);
    });

    it("handles zero myEquityShare with shared ownership (same as no myEquityShare)", () => {
      const data: MortgageData = {
        totalPropertyValue: 400000,
        equity: 100000,
        valuationDate: "2023-01-01",
        postcode: "E1 1AA",
        sharedOwnershipPercent: 60,
        myEquityShare: 0,
      };
      const result = calculateCurrentEquity(data, 5);
      // Property value: 400000 * 1.05 = 420000
      // Outstanding: 300000
      // Full equity: 420000 - 300000 = 120000
      // myEquityShare = 0 → falls into "split full equity" branch
      // adjustedEquity: 120000 * 60/100 = 72000
      // adjustedOriginalEquity: 100000 * 60/100 = 60000
      expect(result.currentEquity).toBeCloseTo(120000, 0);
      expect(result.adjustedEquity).toBeCloseTo(72000, 0);
      expect(result.adjustedOriginalEquity).toBeCloseTo(60000, 0);
      const equityChangePct =
        ((result.adjustedEquity - result.adjustedOriginalEquity) / result.adjustedOriginalEquity) * 100;
      expect(equityChangePct).toBeCloseTo(20, 0);
    });

    it("myEquityShare with principal repayment", () => {
      const data: MortgageData = {
        totalPropertyValue: 500000,
        equity: 200000,
        valuationDate: "2023-01-01",
        postcode: "SW1A 1AA",
        sharedOwnershipPercent: 50,
        myEquityShare: 130000,
        mortgageRate: 4.5,
        mortgageTerm: 25,
        mortgageStartDate: "2023-01-01",
      };
      const result = calculateCurrentEquity(data, 0, "2025-01-01");
      // With 0% HPI, netChange = principalRepaid + 0
      expect(result.principalRepaid).toBeGreaterThan(0);
      expect(result.netChange).toBeCloseTo(result.principalRepaid, 0);
      // adjustedEquity = 130000 + (principalRepaid * 50/100)
      const expectedAdjusted = 130000 + (result.principalRepaid * 50) / 100;
      expect(result.adjustedEquity).toBeCloseTo(expectedAdjusted, 0);
      expect(result.adjustedOriginalEquity).toBe(130000);
    });
  });

  // ────────────────────────────────────────
  // Real-Life Example Validation
  // ────────────────────────────────────────

  describe("real-life example", () => {
    // Based on a real mortgage with bank-confirmed figures
    const realData: MortgageData = {
      totalPropertyValue: 470000,
      equity: 47000,
      valuationDate: "2022-09-01",
      postcode: "SW1A 1AA",
      mortgageRate: 2.5,
      mortgageTerm: 30,
      mortgageStartDate: "2022-09-01",
      sharedOwnershipPercent: 60,
      myEquityShare: 40000,
    };

    // HPI returned: -5.1%
    const hpi = -5.1;

    it("calculates correct property value after HPI", () => {
      const result = calculateCurrentEquity(realData, hpi);
      // 470000 * (1 - 0.051) = 470000 * 0.949 = 446030
      expect(result.currentPropertyValue).toBeCloseTo(446030, 0);
    });

    it("calculates correct market appreciation", () => {
      const result = calculateCurrentEquity(realData, hpi);
      // 470000 * -0.051 = -23970
      expect(result.appreciation).toBeCloseTo(-23970, 0);
    });

    it("calculates principal repaid in reasonable range", () => {
      // Bank shows ~£32,022 over ~2.75 years (Sep 2022 to Jun 2025)
      const result = calculateCurrentEquity(realData, hpi, "2025-06-01");
      // Our amortization calculator should give a figure close to the bank's
      // (minor differences possible due to exact payment dates, rounding,
      // and the bank using actual calendar days vs our monthly model)
      expect(result.principalRepaid).toBeGreaterThan(26000);
      expect(result.principalRepaid).toBeLessThan(36000);
    });

    it("calculates net change correctly", () => {
      const result = calculateCurrentEquity(realData, hpi, "2025-06-01");
      // netChange = principalRepaid + appreciation
      expect(result.netChange).toBeCloseTo(result.principalRepaid + result.appreciation, 0);
    });

    it("applies shared ownership to net change only, not to myEquityShare", () => {
      const result = calculateCurrentEquity(realData, hpi, "2025-06-01");
      // adjustedEquity = myEquityShare + (netChange × 60/100)
      // = 40000 + (netChange × 0.6)
      const expectedAdjusted = 40000 + (result.netChange * 60) / 100;
      expect(result.adjustedEquity).toBeCloseTo(expectedAdjusted, 0);
    });

    it("adjustedOriginalEquity equals myEquityShare", () => {
      const result = calculateCurrentEquity(realData, hpi, "2025-06-01");
      expect(result.adjustedOriginalEquity).toBe(40000);
    });

    it("matches expected final equity from bank calculator (approximate)", () => {
      // Bank shows: principal paid ≈ £32,022
      // Market change: 470000 × -0.051 = -£23,970
      // Net change: 32022 - 23970 = £8,052
      // My share of change: 8052 × 0.6 = £4,831.20
      // My final equity: 40000 + 4831.20 = £44,831.20
      //
      // Our calculator uses its own amortization, so principal may differ slightly.
      // But the formula application should produce a result in the same ballpark.
      const result = calculateCurrentEquity(realData, hpi, "2025-06-01");
      // Verify the formula is applied correctly
      expect(result.adjustedEquity).toBeCloseTo(40000 + (result.netChange * 60) / 100, 0);
      // The result should be in the approximate range of the bank's figure
      // (allowing for amortization differences)
      expect(result.adjustedEquity).toBeGreaterThan(40000);
      expect(result.adjustedEquity).toBeLessThan(50000);
    });
  });
});

// ──────────────────────────────────────────
// getCurrentPrincipalInterestRatio
// ──────────────────────────────────────────

describe("getCurrentPrincipalInterestRatio", () => {
  it("returns null when mortgage repayment data is not provided", () => {
    const data: MortgageData = {
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-01-01",
      postcode: "SW1A 1AA",
    };
    expect(getCurrentPrincipalInterestRatio(data)).toBeNull();
  });

  it("returns null when there is no outstanding mortgage", () => {
    const data: MortgageData = {
      totalPropertyValue: 350000,
      equity: 350000,
      valuationDate: "2023-01-01",
      postcode: "SW1A 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2020-01-01",
    };
    expect(getCurrentPrincipalInterestRatio(data)).toBeNull();
  });

  it("returns a ratio at the start of a mortgage (interest-heavy)", () => {
    const data: MortgageData = {
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-01-01",
      postcode: "SW1A 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2023-01-01",
    };
    const result = getCurrentPrincipalInterestRatio(data, "2023-02-01");
    expect(result).not.toBeNull();
    // Early in mortgage: interest > principal
    expect(result!.interestPercent).toBeGreaterThan(result!.principalPercent);
    // Percentages should sum to ~100
    expect(result!.principalPercent + result!.interestPercent).toBeCloseTo(100, 0);
  });

  it("returns a ratio late in a mortgage (principal-heavy)", () => {
    const data: MortgageData = {
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-01-01",
      postcode: "SW1A 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2000-01-01",
    };
    // 24 years into a 25-year mortgage
    const result = getCurrentPrincipalInterestRatio(data, "2024-01-01");
    expect(result).not.toBeNull();
    // Late in mortgage: principal > interest
    expect(result!.principalPercent).toBeGreaterThan(result!.interestPercent);
  });

  it("principal percentage increases over time", () => {
    const data: MortgageData = {
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-01-01",
      postcode: "SW1A 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2020-01-01",
    };
    const early = getCurrentPrincipalInterestRatio(data, "2020-06-01");
    const middle = getCurrentPrincipalInterestRatio(data, "2030-06-01");
    const late = getCurrentPrincipalInterestRatio(data, "2040-06-01");

    expect(early).not.toBeNull();
    expect(middle).not.toBeNull();
    expect(late).not.toBeNull();

    expect(middle!.principalPercent).toBeGreaterThan(early!.principalPercent);
    expect(late!.principalPercent).toBeGreaterThan(middle!.principalPercent);
  });

  it("includes a positive monthly payment amount", () => {
    const data: MortgageData = {
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-01-01",
      postcode: "SW1A 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2023-01-01",
    };
    const result = getCurrentPrincipalInterestRatio(data, "2023-06-01");
    expect(result).not.toBeNull();
    expect(result!.monthlyPayment).toBeGreaterThan(0);
  });

  it("returns null when current date is before mortgage start", () => {
    const data: MortgageData = {
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-01-01",
      postcode: "SW1A 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2025-01-01",
    };
    // Date before mortgage starts
    const result = getCurrentPrincipalInterestRatio(data, "2024-06-01");
    expect(result).toBeNull();
  });

  it("returns null when current date is after mortgage ends", () => {
    const data: MortgageData = {
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-01-01",
      postcode: "SW1A 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 5,
      mortgageStartDate: "2015-01-01",
    };
    // 5-year term ended in 2020
    const result = getCurrentPrincipalInterestRatio(data, "2025-01-01");
    expect(result).toBeNull();
  });

  it("percentages are always between 0 and 100", () => {
    const data: MortgageData = {
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-01-01",
      postcode: "SW1A 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2023-01-01",
    };
    // Test several points in time
    const dates = ["2023-06-01", "2025-01-01", "2030-01-01", "2035-01-01", "2040-01-01", "2045-01-01", "2047-06-01"];
    for (const date of dates) {
      const result = getCurrentPrincipalInterestRatio(data, date);
      if (result) {
        expect(result.principalPercent).toBeGreaterThanOrEqual(0);
        expect(result.principalPercent).toBeLessThanOrEqual(100);
        expect(result.interestPercent).toBeGreaterThanOrEqual(0);
        expect(result.interestPercent).toBeLessThanOrEqual(100);
      }
    }
  });
});
