/**
 * Tests for the FIRE projection calculator.
 *
 * Covers:
 * - calculateProjection: full projection timeline with and without contributions
 * - projectYearValue: single-year growth formula
 * - calculateFireNumber: FIRE number from spending + withdrawal rate
 * - calculateRealGrowthRate: nominal → real rate conversion
 * - calculateDaysUntil: calendar day counting
 * - yearsUntil: fractional year counting
 * - calculateWorkingDays: business days minus holidays
 * - totalAnnualContribution: contribution aggregation
 * - Edge cases: zero growth, negative real rate, zero contributions, target already met
 */

import {
  calculateProjection,
  projectYearValue,
  calculateFireNumber,
  calculateRealGrowthRate,
  calculateDaysUntil,
  yearsUntil,
  calculateWorkingDays,
  totalAnnualContribution,
} from "../services/fire-calculator";
import { FireCalculatorInput } from "../utils/fire-types";

// ──────────────────────────────────────────
// Shared test fixtures
// ──────────────────────────────────────────

/** A standard FIRE scenario for projection tests */
const BASE_INPUT: FireCalculatorInput = {
  currentPortfolioValue: 200_000,
  targetValue: 1_000_000,
  annualGrowthRate: 7,
  annualInflation: 2.5,
  annualContribution: 24_000,
  yearOfBirth: 1990,
  sippAccessAge: 57,
  holidayEntitlement: 25,
};

/** A fixed "now" date for deterministic tests */
const FIXED_NOW = new Date(2025, 0, 15); // January 15, 2025

// ──────────────────────────────────────────
// calculateRealGrowthRate
// ──────────────────────────────────────────

describe("calculateRealGrowthRate", () => {
  it("calculates 7% growth − 2.5% inflation = 4.5% real (0.045)", () => {
    expect(calculateRealGrowthRate(7, 2.5)).toBeCloseTo(0.045, 6);
  });

  it("calculates 5% growth − 5% inflation = 0% real", () => {
    expect(calculateRealGrowthRate(5, 5)).toBeCloseTo(0, 6);
  });

  it("handles negative real return (3% growth − 5% inflation)", () => {
    expect(calculateRealGrowthRate(3, 5)).toBeCloseTo(-0.02, 6);
  });

  it("handles zero growth and zero inflation", () => {
    expect(calculateRealGrowthRate(0, 0)).toBeCloseTo(0, 6);
  });

  it("handles high growth rate (15% − 3%)", () => {
    expect(calculateRealGrowthRate(15, 3)).toBeCloseTo(0.12, 6);
  });
});

// ──────────────────────────────────────────
// calculateFireNumber
// ──────────────────────────────────────────

describe("calculateFireNumber", () => {
  it("calculates £3,000/mo at 4% withdrawal → £900,000", () => {
    expect(calculateFireNumber(3000, 4)).toBe(900_000);
  });

  it("calculates £2,000/mo at 4% withdrawal → £600,000", () => {
    expect(calculateFireNumber(2000, 4)).toBe(600_000);
  });

  it("calculates £5,000/mo at 3% withdrawal → £2,000,000", () => {
    expect(calculateFireNumber(5000, 3)).toBeCloseTo(2_000_000, 0);
  });

  it("calculates £1,000/mo at 3.5% withdrawal", () => {
    // 1000 × 12 × (100 / 3.5) = 12000 × 28.5714... ≈ 342857.14
    expect(calculateFireNumber(1000, 3.5)).toBeCloseTo(342_857.14, 0);
  });

  it("returns 0 for zero withdrawal rate (division by zero guard)", () => {
    expect(calculateFireNumber(3000, 0)).toBe(0);
  });

  it("returns 0 for negative withdrawal rate", () => {
    expect(calculateFireNumber(3000, -1)).toBe(0);
  });

  it("handles very small spending (£100/mo at 4%)", () => {
    expect(calculateFireNumber(100, 4)).toBe(30_000);
  });
});

// ──────────────────────────────────────────
// projectYearValue
// ──────────────────────────────────────────

describe("projectYearValue", () => {
  it("compounds existing value at the real rate + adds contributions with half-year growth", () => {
    // previousValue=100000, realRate=0.045, annualContribution=24000
    // growth on existing: 100000 × 1.045 = 104500
    // contribution with half-year: 24000 × (1 + 0.045/2) = 24000 × 1.0225 = 24540
    // total: 104500 + 24540 = 129040
    expect(projectYearValue(100_000, 0.045, 24_000)).toBeCloseTo(129_040, 0);
  });

  it("handles zero contributions (pure compound growth)", () => {
    // 100000 × 1.045 = 104500
    expect(projectYearValue(100_000, 0.045, 0)).toBeCloseTo(104_500, 0);
  });

  it("handles zero growth rate", () => {
    // 100000 × 1.0 + 24000 × 1.0 = 124000
    expect(projectYearValue(100_000, 0, 24_000)).toBeCloseTo(124_000, 0);
  });

  it("handles negative real rate", () => {
    // 100000 × 0.98 + 24000 × (1 + (-0.02/2)) = 98000 + 24000 × 0.99 = 98000 + 23760 = 121760
    expect(projectYearValue(100_000, -0.02, 24_000)).toBeCloseTo(121_760, 0);
  });

  it("handles zero starting value with contributions", () => {
    // 0 × 1.045 + 24000 × 1.0225 = 24540
    expect(projectYearValue(0, 0.045, 24_000)).toBeCloseTo(24_540, 0);
  });

  it("handles large values without precision loss", () => {
    const result = projectYearValue(10_000_000, 0.045, 120_000);
    // 10M × 1.045 + 120K × 1.0225 = 10,450,000 + 122,700 = 10,572,700
    expect(result).toBeCloseTo(10_572_700, 0);
  });
});

// ──────────────────────────────────────────
// totalAnnualContribution
// ──────────────────────────────────────────

describe("totalAnnualContribution", () => {
  it("sums monthly contributions × 12", () => {
    const contributions = [{ monthlyAmount: 500 }, { monthlyAmount: 300 }];
    expect(totalAnnualContribution(contributions)).toBe(9_600);
  });

  it("returns 0 for empty contributions", () => {
    expect(totalAnnualContribution([])).toBe(0);
  });

  it("filters out zero and negative amounts", () => {
    const contributions = [{ monthlyAmount: 500 }, { monthlyAmount: 0 }, { monthlyAmount: -100 }];
    expect(totalAnnualContribution(contributions)).toBe(6_000);
  });

  it("handles a single contribution", () => {
    expect(totalAnnualContribution([{ monthlyAmount: 1000 }])).toBe(12_000);
  });
});

// ──────────────────────────────────────────
// calculateDaysUntil
// ──────────────────────────────────────────

describe("calculateDaysUntil", () => {
  it("counts days from Jan 15 2025 to Jan 1 2026", () => {
    const days = calculateDaysUntil(2026, FIXED_NOW);
    // Jan 15 → Jan 1 next year = 351 days
    expect(days).toBe(351);
  });

  it("counts days from Jan 15 2025 to Jan 1 2030", () => {
    const days = calculateDaysUntil(2030, FIXED_NOW);
    // ~5 years minus 14 days, accounting for leap year 2028
    // Jan 1 2030 - Jan 15 2025 = 1812 days
    expect(days).toBe(1812);
  });

  it("returns 0 for the current year", () => {
    const days = calculateDaysUntil(2025, FIXED_NOW);
    expect(days).toBe(0);
  });

  it("returns 0 for past years", () => {
    const days = calculateDaysUntil(2020, FIXED_NOW);
    expect(days).toBe(0);
  });
});

// ──────────────────────────────────────────
// yearsUntil
// ──────────────────────────────────────────

describe("yearsUntil", () => {
  it("returns approximately 1 year for next year", () => {
    const y = yearsUntil(2026, FIXED_NOW);
    expect(y).toBeCloseTo(0.96, 1); // ~351 / 365.25
  });

  it("returns approximately 5 years for 2030", () => {
    const y = yearsUntil(2030, FIXED_NOW);
    expect(y).toBeCloseTo(4.96, 1);
  });

  it("returns 0 for past or current year", () => {
    expect(yearsUntil(2025, FIXED_NOW)).toBe(0);
    expect(yearsUntil(2020, FIXED_NOW)).toBe(0);
  });
});

// ──────────────────────────────────────────
// calculateWorkingDays
// ──────────────────────────────────────────

describe("calculateWorkingDays", () => {
  it("estimates working days for 365 calendar days with 25 holidays over 1 year", () => {
    // businessDays = 365 × 5/7 ≈ 260.7
    // holidays = 25 × 1 = 25
    // working = round(260.7 - 25) = 236
    expect(calculateWorkingDays(365, 1, 25)).toBe(236);
  });

  it("scales holidays with years remaining", () => {
    // 1825 days (~5 years), 5 years, 25 holidays/year
    // businessDays = 1825 × 5/7 ≈ 1303.6
    // holidays = 25 × 5 = 125
    // working = round(1303.6 - 125) = 1179
    expect(calculateWorkingDays(1825, 5, 25)).toBe(1179);
  });

  it("returns 0 for zero days", () => {
    expect(calculateWorkingDays(0, 0, 25)).toBe(0);
  });

  it("never returns negative", () => {
    // Very generous holidays: 365 days × 5/7 = ~260 business days, minus 300 holidays
    expect(calculateWorkingDays(365, 1, 300)).toBe(0);
  });

  it("handles zero holiday entitlement", () => {
    // businessDays = 365 × 5/7 ≈ 260.7 → round = 261
    expect(calculateWorkingDays(365, 1, 0)).toBe(261);
  });
});

// ──────────────────────────────────────────
// calculateProjection — full projection tests
// ──────────────────────────────────────────

describe("calculateProjection", () => {
  it("returns a timeline starting at the current year", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    expect(projection.years[0].year).toBe(2025);
  });

  it("year 0 has the current portfolio value", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    expect(projection.years[0].portfolioValue).toBe(200_000);
  });

  it("computes correct age from yearOfBirth", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    // Born 1990, year 2025 → age 35
    expect(projection.years[0].age).toBe(35);
  });

  it("eventually hits the FIRE target", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    expect(projection.targetHitInWindow).toBe(true);
    expect(projection.fireYear).not.toBeNull();
  });

  it("marks the correct year as isTargetHit", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    const fireYearData = projection.years.find((y) => y.year === projection.fireYear);
    expect(fireYearData?.isTargetHit).toBe(true);

    // Year before FIRE should NOT have target hit
    const yearBefore = projection.years.find((y) => y.year === (projection.fireYear ?? 0) - 1);
    if (yearBefore) {
      expect(yearBefore.isTargetHit).toBe(false);
    }
  });

  it("shows post-FIRE years (up to 5 beyond FIRE year)", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    if (projection.fireYear) {
      const lastYear = projection.years[projection.years.length - 1].year;
      expect(lastYear).toBe(projection.fireYear + 5);
    }
  });

  it("calculates daysToFire and workingDaysToFire when target is hit", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    expect(projection.daysToFire).toBeGreaterThan(0);
    expect(projection.workingDaysToFire).toBeGreaterThan(0);
    expect(projection.workingDaysToFire!).toBeLessThan(projection.daysToFire!);
  });

  it("returns null metrics when target is not hit within 30 years", () => {
    const unreachable: FireCalculatorInput = {
      ...BASE_INPUT,
      currentPortfolioValue: 1_000,
      targetValue: 100_000_000,
      annualContribution: 0,
      annualGrowthRate: 3,
      annualInflation: 3,
    };
    const projection = calculateProjection(unreachable, FIXED_NOW);
    expect(projection.targetHitInWindow).toBe(false);
    expect(projection.fireYear).toBeNull();
    expect(projection.fireAge).toBeNull();
    expect(projection.daysToFire).toBeNull();
    expect(projection.workingDaysToFire).toBeNull();
  });

  it("caps at 30 years when target is not hit", () => {
    const unreachable: FireCalculatorInput = {
      ...BASE_INPUT,
      currentPortfolioValue: 1_000,
      targetValue: 100_000_000,
      annualContribution: 0,
    };
    const projection = calculateProjection(unreachable, FIXED_NOW);
    // year 0 + 30 more = 31 data points
    expect(projection.years.length).toBe(31);
    expect(projection.years[projection.years.length - 1].year).toBe(2055);
  });

  it("marks SIPP accessible when age >= sippAccessAge", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    // Born 1990, SIPP at 57 → accessible from 2047
    const sippYear = projection.years.find((y) => y.year === 2047);
    if (sippYear) {
      expect(sippYear.isSippAccessible).toBe(true);
      expect(sippYear.age).toBe(57);
    }

    // 2046 should NOT be accessible
    const preSipp = projection.years.find((y) => y.year === 2046);
    if (preSipp) {
      expect(preSipp.isSippAccessible).toBe(false);
    }
  });

  it("stores realGrowthRate and annualContribution in the result", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    expect(projection.realGrowthRate).toBeCloseTo(0.045, 6);
    expect(projection.annualContribution).toBe(24_000);
  });

  it("stores currentPortfolioValue and targetValue in the result", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    expect(projection.currentPortfolioValue).toBe(200_000);
    expect(projection.targetValue).toBe(1_000_000);
  });
});

// ──────────────────────────────────────────
// calculateProjection — edge cases
// ──────────────────────────────────────────

describe("calculateProjection — edge cases", () => {
  it("handles target already met (currentValue >= targetValue)", () => {
    const alreadyFire: FireCalculatorInput = {
      ...BASE_INPUT,
      currentPortfolioValue: 1_500_000,
      targetValue: 1_000_000,
    };
    const projection = calculateProjection(alreadyFire, FIXED_NOW);
    expect(projection.targetHitInWindow).toBe(true);
    expect(projection.fireYear).toBe(2025);
    expect(projection.years[0].isTargetHit).toBe(true);
    expect(projection.daysToFire).toBe(0);
  });

  it("handles zero portfolio value with contributions", () => {
    const zeroStart: FireCalculatorInput = {
      ...BASE_INPUT,
      currentPortfolioValue: 0,
      targetValue: 500_000,
      annualContribution: 36_000,
    };
    const projection = calculateProjection(zeroStart, FIXED_NOW);
    expect(projection.years[0].portfolioValue).toBe(0);
    expect(projection.years[1].portfolioValue).toBeGreaterThan(0);
    // Should eventually hit target from contributions alone
    expect(projection.targetHitInWindow).toBe(true);
  });

  it("handles zero growth with contributions (linear accumulation)", () => {
    const noGrowth: FireCalculatorInput = {
      ...BASE_INPUT,
      currentPortfolioValue: 0,
      annualGrowthRate: 2.5,
      annualInflation: 2.5, // real rate = 0
      annualContribution: 50_000,
      targetValue: 500_000,
    };
    const projection = calculateProjection(noGrowth, FIXED_NOW);
    // With zero real rate: each year adds exactly 50000
    // Year 10: 10 × 50000 = 500000
    expect(projection.years[10].portfolioValue).toBeCloseTo(500_000, 0);
    expect(projection.targetHitInWindow).toBe(true);
    expect(projection.fireYear).toBe(2035);
  });

  it("handles negative real growth rate", () => {
    const negativeGrowth: FireCalculatorInput = {
      ...BASE_INPUT,
      currentPortfolioValue: 500_000,
      annualGrowthRate: 2,
      annualInflation: 4, // real rate = -2%
      annualContribution: 0,
      targetValue: 1_000_000,
    };
    const projection = calculateProjection(negativeGrowth, FIXED_NOW);
    // Portfolio shrinks each year without contributions
    expect(projection.years[1].portfolioValue).toBeLessThan(500_000);
    expect(projection.targetHitInWindow).toBe(false);
  });

  it("handles very large annual contributions", () => {
    const bigSaver: FireCalculatorInput = {
      ...BASE_INPUT,
      currentPortfolioValue: 0,
      annualContribution: 200_000,
      targetValue: 1_000_000,
    };
    const projection = calculateProjection(bigSaver, FIXED_NOW);
    // Should hit target very quickly
    expect(projection.fireYear).not.toBeNull();
    expect(projection.fireYear! - 2025).toBeLessThanOrEqual(6);
  });

  it("portfolio values grow monotonically with positive real rate and contributions", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    for (let i = 1; i < projection.years.length; i++) {
      expect(projection.years[i].portfolioValue).toBeGreaterThan(projection.years[i - 1].portfolioValue);
    }
  });

  it("ages increment by 1 each year", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    for (let i = 1; i < projection.years.length; i++) {
      expect(projection.years[i].age).toBe(projection.years[i - 1].age + 1);
    }
  });

  it("years increment by 1 each year", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    for (let i = 1; i < projection.years.length; i++) {
      expect(projection.years[i].year).toBe(projection.years[i - 1].year + 1);
    }
  });

  it("stops contributions after the FIRE year", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    expect(projection.fireYear).not.toBeNull();

    // Find the FIRE year index and the year after it
    const fireIdx = projection.years.findIndex((y) => y.year === projection.fireYear);
    expect(fireIdx).toBeGreaterThan(0);
    expect(fireIdx + 1).toBeLessThan(projection.years.length);

    // The year AFTER FIRE should equal pure compound growth on the FIRE year value
    // (no contributions added): postFireValue = fireValue × (1 + realRate)
    const fireValue = projection.years[fireIdx].portfolioValue;
    const realRate = projection.realGrowthRate;
    const expectedPostFire = fireValue * (1 + realRate);
    expect(projection.years[fireIdx + 1].portfolioValue).toBeCloseTo(expectedPostFire, 2);
  });

  it("FIRE year itself still includes contributions", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    expect(projection.fireYear).not.toBeNull();

    const fireIdx = projection.years.findIndex((y) => y.year === projection.fireYear);
    const preFire = projection.years[fireIdx - 1];
    const realRate = projection.realGrowthRate;

    // The FIRE year should equal compound growth + contributions (half-year approx)
    const expectedWithContrib = projectYearValue(preFire.portfolioValue, realRate, BASE_INPUT.annualContribution);
    expect(projection.years[fireIdx].portfolioValue).toBeCloseTo(expectedWithContrib, 2);
  });

  it("post-FIRE values still grow via compound interest (no contributions)", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    expect(projection.fireYear).not.toBeNull();

    const fireIdx = projection.years.findIndex((y) => y.year === projection.fireYear);
    const realRate = projection.realGrowthRate;

    // Verify every post-FIRE year is pure compound growth on the previous year
    for (let i = fireIdx + 1; i < projection.years.length; i++) {
      const expected = projection.years[i - 1].portfolioValue * (1 + realRate);
      expect(projection.years[i].portfolioValue).toBeCloseTo(expected, 2);
    }
  });

  it("post-FIRE growth is slower than pre-FIRE growth", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    expect(projection.fireYear).not.toBeNull();

    const fireIdx = projection.years.findIndex((y) => y.year === projection.fireYear);

    // Pre-FIRE growth includes contributions, so the delta should be larger
    const preFireDelta = projection.years[fireIdx].portfolioValue - projection.years[fireIdx - 1].portfolioValue;
    const postFireDelta = projection.years[fireIdx + 1].portfolioValue - projection.years[fireIdx].portfolioValue;
    expect(preFireDelta).toBeGreaterThan(postFireDelta);
  });
});

// ──────────────────────────────────────────
// Projection numerical accuracy
// ──────────────────────────────────────────

describe("calculateProjection — numerical accuracy", () => {
  it("year 1 matches the projectYearValue formula exactly", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    const expectedYear1 = projectYearValue(200_000, 0.045, 24_000);
    expect(projection.years[1].portfolioValue).toBeCloseTo(expectedYear1, 2);
  });

  it("year 2 compounds correctly on year 1", () => {
    const projection = calculateProjection(BASE_INPUT, FIXED_NOW);
    const year1Value = projection.years[1].portfolioValue;
    const expectedYear2 = projectYearValue(year1Value, 0.045, 24_000);
    expect(projection.years[2].portfolioValue).toBeCloseTo(expectedYear2, 2);
  });

  it("pure compound growth (no contributions) matches (1+r)^n formula", () => {
    const noContrib: FireCalculatorInput = {
      ...BASE_INPUT,
      annualContribution: 0,
      targetValue: 10_000_000, // High target to get full 30-year projection
    };
    const projection = calculateProjection(noContrib, FIXED_NOW);
    const r = 0.045;
    const expected10yr = 200_000 * Math.pow(1 + r, 10);
    expect(projection.years[10].portfolioValue).toBeCloseTo(expected10yr, 0);
  });
});
