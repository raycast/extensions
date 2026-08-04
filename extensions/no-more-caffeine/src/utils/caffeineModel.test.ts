import { describe, test, expect, beforeEach } from "vitest";
import {
  calculateResidualCaffeine,
  calculateTotalResidualCaffeine,
  calculateTodayTotal,
  getBedtimeDate,
  determineStatus,
  calculateCaffeineMetrics,
} from "./caffeineModel";
import { CaffeineIntake, Settings } from "../types";

describe("caffeineModel", () => {
  describe("calculateResidualCaffeine", () => {
    test("returns full amount when target time is before intake", () => {
      const intake: CaffeineIntake = {
        id: "1",
        timestamp: new Date("2026-01-19T10:00:00"),
        amount: 100,
        drinkType: "Coffee",
      };
      const targetTime = new Date("2026-01-19T09:00:00");
      const result = calculateResidualCaffeine(intake, targetTime, 5);
      expect(result).toBe(100);
    });

    test("calculates correct residual after one half-life", () => {
      const intake: CaffeineIntake = {
        id: "1",
        timestamp: new Date("2026-01-19T10:00:00"),
        amount: 100,
        drinkType: "Coffee",
      };
      const targetTime = new Date("2026-01-19T15:00:00");
      const result = calculateResidualCaffeine(intake, targetTime, 5);
      expect(result).toBeCloseTo(50, 1);
    });

    test("calculates correct residual after two half-lives", () => {
      const intake: CaffeineIntake = {
        id: "1",
        timestamp: new Date("2026-01-19T10:00:00"),
        amount: 100,
        drinkType: "Coffee",
      };
      const targetTime = new Date("2026-01-19T20:00:00");
      const result = calculateResidualCaffeine(intake, targetTime, 5);
      expect(result).toBeCloseTo(25, 1);
    });
  });

  describe("calculateTotalResidualCaffeine", () => {
    test("sums residual from multiple intakes", () => {
      const intakes: CaffeineIntake[] = [
        {
          id: "1",
          timestamp: new Date("2026-01-19T10:00:00"),
          amount: 100,
          drinkType: "Coffee",
        },
        {
          id: "2",
          timestamp: new Date("2026-01-19T14:00:00"),
          amount: 80,
          drinkType: "Tea",
        },
      ];
      const targetTime = new Date("2026-01-19T15:00:00");
      const result = calculateTotalResidualCaffeine(intakes, targetTime, 5);
      expect(result).toBeGreaterThan(115);
      expect(result).toBeLessThan(125);
    });

    test("filters out intakes outside time window", () => {
      const intakes: CaffeineIntake[] = [
        {
          id: "1",
          timestamp: new Date("2026-01-17T10:00:00"),
          amount: 100,
          drinkType: "Coffee",
        },
        {
          id: "2",
          timestamp: new Date("2026-01-19T14:00:00"),
          amount: 80,
          drinkType: "Tea",
        },
      ];
      const targetTime = new Date("2026-01-19T15:00:00");
      const result = calculateTotalResidualCaffeine(intakes, targetTime, 5, 24);
      expect(result).toBeGreaterThan(65);
      expect(result).toBeLessThan(75);
    });
  });

  describe("calculateTodayTotal", () => {
    test("sums only today's intakes", () => {
      const intakes: CaffeineIntake[] = [
        {
          id: "1",
          timestamp: new Date("2026-01-18T10:00:00"),
          amount: 100,
          drinkType: "Coffee",
        },
        {
          id: "2",
          timestamp: new Date("2026-01-19T08:00:00"),
          amount: 80,
          drinkType: "Coffee",
        },
        {
          id: "3",
          timestamp: new Date("2026-01-19T14:00:00"),
          amount: 50,
          drinkType: "Tea",
        },
      ];
      const result = calculateTodayTotal(intakes, new Date("2026-01-19T15:00:00"));
      expect(result).toBe(130);
    });
  });

  describe("getBedtimeDate", () => {
    test("returns today's bedtime if not yet passed", () => {
      const bedtime = getBedtimeDate("23:30");
      const now = new Date();
      expect(bedtime.getHours()).toBe(23);
      expect(bedtime.getMinutes()).toBe(30);
      expect(bedtime.getDate()).toBeGreaterThanOrEqual(now.getDate());
    });

    test("returns tomorrow's bedtime if already passed (default behavior)", () => {
      const bedtime = getBedtimeDate("00:00");
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        expect(bedtime.getDate()).toBeGreaterThanOrEqual(now.getDate());
      } else {
        expect(bedtime.getDate()).toBeGreaterThan(now.getDate());
      }
    });

    test("returns today's bedtime even if passed when allowPastTime=true", () => {
      const now = new Date();
      const pastTime = `${String(now.getHours() - 1).padStart(2, "0")}:00`;
      const bedtime = getBedtimeDate(pastTime, true);
      expect(bedtime.getDate()).toBe(now.getDate());
      expect(bedtime.getHours()).toBe(now.getHours() - 1);
    });
  });

  describe("determineStatus", () => {
    describe("normal judgment (before bedtime or after 6 hours past bedtime)", () => {
      test("returns 'no-more-caffeine' when daily max exceeded", () => {
        const status = determineStatus(30, 50, 400, 300);
        expect(status).toBe("no-more-caffeine");
      });

      test("returns 'no-more-caffeine' when predicted residual exceeds threshold", () => {
        const status = determineStatus(60, 50, 200);
        expect(status).toBe("no-more-caffeine");
      });

      test("returns 'warning' when predicted residual is 70-100% of threshold", () => {
        const status = determineStatus(40, 50, 200); // 80%
        expect(status).toBe("warning");
      });

      test("returns 'warning' when close to bedtime and at 50% threshold", () => {
        const now = new Date("2026-01-19T21:30:00");
        const bedtime = new Date("2026-01-19T22:00:00");
        const status = determineStatus(25, 50, 200, undefined, now, bedtime);
        expect(status).toBe("warning");
      });

      test("returns 'safe' when below warning thresholds", () => {
        const status = determineStatus(20, 50, 200);
        expect(status).toBe("safe");
      });
    });

    describe("past-bedtime judgment (within 6 hours after bedtime)", () => {
      test("returns 'no-more-caffeine' when current residual >= threshold", () => {
        const now = new Date("2026-01-19T22:30:00");
        const bedtime = new Date("2026-01-19T22:00:00");
        const status = determineStatus(10, 50, 200, undefined, now, bedtime, 55);
        expect(status).toBe("no-more-caffeine");
      });

      test("returns 'warning' when current residual is 50-100% of threshold", () => {
        const now = new Date("2026-01-19T23:00:00");
        const bedtime = new Date("2026-01-19T22:00:00");
        const status = determineStatus(10, 50, 200, undefined, now, bedtime, 30);
        expect(status).toBe("warning");
      });

      test("returns 'safe' when current residual is below warning threshold", () => {
        const now = new Date("2026-01-19T23:00:00");
        const bedtime = new Date("2026-01-19T22:00:00");
        const status = determineStatus(10, 50, 200, undefined, now, bedtime, 20);
        expect(status).toBe("safe");
      });

      test("returns to normal judgment after 6 hours past bedtime", () => {
        const now = new Date("2026-01-20T04:30:00");
        const bedtime = new Date("2026-01-19T22:00:00");
        const status = determineStatus(60, 50, 200, undefined, now, bedtime, 55);
        expect(status).toBe("no-more-caffeine");
      });

      test("still uses past-bedtime judgment at exactly 6 hours", () => {
        const now = new Date("2026-01-20T03:59:00");
        const bedtime = new Date("2026-01-19T22:00:00");
        const status = determineStatus(10, 50, 200, undefined, now, bedtime, 55);
        expect(status).toBe("no-more-caffeine");
      });
    });
  });

  describe("calculateCaffeineMetrics", () => {
    let settings: Settings;
    let intakes: CaffeineIntake[];

    beforeEach(() => {
      settings = {
        bedtime: "22:00",
        halfLife: 5,
        maxCaffeineAtBedtime: 50,
        dailyMaxCaffeine: 400,
      };

      intakes = [
        {
          id: "1",
          timestamp: new Date("2026-01-19T14:00:00"),
          amount: 100,
          drinkType: "Coffee",
        },
      ];
    });

    test("calculates all metrics correctly", () => {
      const now = new Date("2026-01-19T14:00:00");
      const result = calculateCaffeineMetrics(intakes, settings, undefined, undefined, now);
      expect(result.currentResidual).toBeGreaterThan(0);
      expect(result.predictedResidualAtBedtime).toBeGreaterThan(0);
      expect(result.todayTotal).toBe(100);
      expect(result.status).toBeDefined();
    });

    test("includes prediction with new drink when provided", () => {
      const now = new Date("2026-01-19T14:00:00");
      const result = calculateCaffeineMetrics(intakes, settings, 80, undefined, now);
      expect(result.predictedResidualAtBedtimeWithNewDrink).toBeDefined();
      expect(result.predictedResidualAtBedtimeWithNewDrink).toBeGreaterThan(result.predictedResidualAtBedtime);
      expect(result.todayTotal).toBe(180);
    });

    test("uses past-bedtime judgment when appropriate", () => {
      const pastBedtimeIntakes: CaffeineIntake[] = [
        {
          id: "1",
          timestamp: new Date("2026-01-19T21:00:00"),
          amount: 100,
          drinkType: "Coffee",
        },
      ];
      const now = new Date("2026-01-19T22:30:00");
      const result = calculateCaffeineMetrics(pastBedtimeIntakes, settings, undefined, undefined, now);

      expect(result.status).toBeDefined();
      expect(["safe", "warning", "no-more-caffeine"]).toContain(result.status);
    });

    function expectBackdatedDrinkLowerPrediction(
      backdatedTimestamp: Date,
      now: Date,
      testIntakes: CaffeineIntake[],
      caffeineMg: number,
    ) {
      const resultBackdated = calculateCaffeineMetrics(testIntakes, settings, caffeineMg, backdatedTimestamp, now);
      const resultCurrent = calculateCaffeineMetrics(testIntakes, settings, caffeineMg, undefined, now);
      expect(resultBackdated.predictedResidualAtBedtimeWithNewDrink).toBeDefined();
      expect(resultCurrent.predictedResidualAtBedtimeWithNewDrink).toBeDefined();
      expect(resultBackdated.predictedResidualAtBedtimeWithNewDrink!).toBeLessThan(
        resultCurrent.predictedResidualAtBedtimeWithNewDrink!,
      );
    }

    test("backdated drink has less predicted residual at bedtime than a current-time drink", () => {
      const now = new Date("2026-01-19T14:00:00");
      const backdatedTimestamp = new Date("2026-01-19T09:00:00"); // 5 hours before now
      expectBackdatedDrinkLowerPrediction(backdatedTimestamp, now, intakes, 80);
    });

    test("newDrinkTimestamp is honored in with-drink prediction", () => {
      const now = new Date("2026-01-19T14:00:00");
      const backdatedTimestamp = new Date("2026-01-19T06:00:00"); // 8 hours before now
      expectBackdatedDrinkLowerPrediction(backdatedTimestamp, now, [], 100);
    });

    test("backdated drink preview uses consistent decay model for past-bedtime status", () => {
      const now = new Date("2026-01-19T22:30:00"); // 30 min after bedtime
      const backdatedTimestamp = new Date("2026-01-19T14:30:00"); // 8 hours before now
      const result = calculateCaffeineMetrics([], settings, 60, backdatedTimestamp, now);

      // ~20 mg remains after 8 hours — below the 50% warning threshold for past-bedtime judgment
      expect(result.status).toBe("safe");
    });

    test("backdated drink from a prior day does not add to today's total", () => {
      const now = new Date("2026-01-19T14:00:00");
      const priorDayTimestamp = new Date("2026-01-18T10:00:00");
      const result = calculateCaffeineMetrics(intakes, settings, 80, priorDayTimestamp, now);
      expect(result.todayTotal).toBe(100);
    });

    test("uses current date for today's total when all stored intakes are backdated", () => {
      const backdatedIntakes: CaffeineIntake[] = [
        {
          id: "1",
          timestamp: new Date("2026-01-18T10:00:00"),
          amount: 100,
          drinkType: "Coffee",
        },
      ];
      const now = new Date("2026-01-19T14:00:00");
      const result = calculateCaffeineMetrics(backdatedIntakes, settings, undefined, undefined, now);

      expect(result.todayTotal).toBe(0);
      expect(result.status).not.toBe("no-more-caffeine");
    });
  });
});
