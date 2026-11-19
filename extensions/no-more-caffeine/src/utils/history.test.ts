import { describe, expect, test } from "vitest";
import { historyStats } from "./history";

const now = new Date(2026, 10, 19, 12);
const intakes = [
  { id: "month", timestamp: new Date(2026, 9, 21, 23), drinkType: "Tea", amount: 30 },
  { id: "week", timestamp: new Date(2026, 10, 13, 0), drinkType: "Matcha", amount: 60 },
  { id: "today", timestamp: new Date(2026, 10, 19, 8), drinkType: "Coffee", amount: 90 },
  { id: "future", timestamp: new Date(2026, 10, 19, 18), drinkType: "Cold Brew", amount: 100 },
  { id: "old", timestamp: new Date(2026, 9, 20, 23), drinkType: "Espresso", amount: 120 },
];

describe("historyStats", () => {
  test("groups today's logged drinks by local hour", () => {
    const stats = historyStats(intakes, "day", now);
    expect(stats.total).toBe(90);
    expect(stats.buckets).toHaveLength(24);
    expect(stats.buckets[8].amount).toBe(90);
    expect(stats.buckets[18].amount).toBe(0);
  });

  test("uses rolling calendar days for the weekly and monthly charts", () => {
    const week = historyStats(intakes, "week", now);
    expect(week.buckets).toHaveLength(7);
    expect(week.buckets[0].amount).toBe(60);
    expect(week.total).toBe(150);

    const month = historyStats(intakes, "month", now);
    expect(month.buckets).toHaveLength(30);
    expect(month.buckets[0].amount).toBe(30);
    expect(month.buckets[29].amount).toBe(90);
    expect(month.count).toBe(3);
    expect(month.dailyAverage).toBe(6);
  });
});
