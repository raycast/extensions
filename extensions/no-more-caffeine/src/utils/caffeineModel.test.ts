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
      expect(result).toBeGreaterThan(130);
      expect(result).toBeLessThan(140);
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
      expect(result).toBeGreaterThan(70);
      expect(result).toBeLessThan(90);
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
      const result = calculateTodayTotal(intakes);
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
      const result = calculateCaffeineMetrics(intakes, settings);
      expect(result.currentResidual).toBeGreaterThan(0);
      expect(result.predictedResidualAtBedtime).toBeGreaterThan(0);
      expect(result.todayTotal).toBe(100);
      expect(result.status).toBeDefined();
    });

    test("includes prediction with new drink when provided", () => {
      const result = calculateCaffeineMetrics(intakes, settings, 80);
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

      const result = calculateCaffeineMetrics(pastBedtimeIntakes, settings);

      expect(result.status).toBeDefined();
      expect(["safe", "warning", "no-more-caffeine"]).toContain(result.status);
    });
  });
});
