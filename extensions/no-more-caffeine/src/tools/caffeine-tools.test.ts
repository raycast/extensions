import { LocalStorage } from "@raycast/api";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getIntakes } from "../utils/storage";
import getCaffeineHistory from "./get-caffeine-history";
import getCaffeineStatus from "./get-caffeine-status";
import listCaffeineDrinks from "./list-caffeine-drinks";
import logCaffeineIntake, { confirmation } from "./log-caffeine-intake";
import previewCaffeine from "./preview-caffeine";

const { storage } = vi.hoisted(() => ({ storage: new Map<string, string>() }));

vi.mock("@raycast/api", async () => ({
  Color: {},
  environment: {
    assetsPath: (await import("node:path")).resolve("assets"),
    ownerOrAuthorName: "atsushi_kawamura",
    extensionName: "no-more-caffeine",
  },
  getPreferenceValues: () => ({ bedtime: "22:00", halfLife: "5", maxCaffeineAtBedtime: "50" }),
  LocalStorage: {
    getItem: async (key: string) => storage.get(key),
    setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
  },
}));

function intake(id: string, day: number, hour: number, amount: number) {
  return { id, timestamp: new Date(2026, 10, day, hour), amount, drinkType: "Coffee" };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 19, 12));
  vi.clearAllMocks();
  storage.clear();
});

afterEach(() => vi.useRealTimers());

describe("Raycast caffeine tools", () => {
  test("reports consumed intake and modeled estimates without counting a future entry as consumed", async () => {
    storage.set("caffeine-intakes", JSON.stringify([intake("past", 19, 8, 95), intake("future", 19, 15, 60)]));
    const result = await getCaffeineStatus();
    expect(result.todayIntakeMg).toBe(95);
    expect(result.estimatedCaffeineNowMg).toBeGreaterThan(0);
    expect(result.estimatedCaffeineAtBedtimeMg).toBeGreaterThan(0);
    expect(result.timelineUrl).toBe("raycast://extensions/atsushi_kawamura/no-more-caffeine/caffeine-timeline");
    expect(LocalStorage.setItem).not.toHaveBeenCalled();
  });

  test("simulates a serving and links to its chart without saving anything", async () => {
    const result = await previewCaffeine({ drink: "cold-brew", servingMl: 280, drinkAt: "16:00" });
    const time = new Date(2026, 10, 19, 16).toISOString();

    expect(result).toMatchObject({ drink: "Cold Brew", caffeineMg: 120, drinkAt: time, saved: false });
    expect(result.estimatedCaffeineAtBedtimeMg).toBe(0);
    expect(result.addedCaffeineAtBedtimeMg).toBeGreaterThan(0);
    expect(result.lastCupBy).not.toBeNull();
    expect(JSON.parse(new URL(result.whatIfUrl).searchParams.get("context") ?? "")).toEqual({
      drinkAt: time,
      caffeineMg: 120,
    });
    expect(await getIntakes()).toEqual([]);
    expect(LocalStorage.setItem).not.toHaveBeenCalled();
  });

  test("marks a drink that would peak after bedtime and has no cutoff if the baseline is over the limit", async () => {
    storage.set("caffeine-intakes", JSON.stringify([intake("large", 19, 8, 450)]));
    const result = await previewCaffeine({ drink: "coffee", drinkAt: "22:00" });
    expect(result.addedDrinkPeaksAfterBedtime).toBe(true);
    expect(result.addedCaffeineAtBedtimeMg).toBe(0);
    expect(result.lastCupBy).toBeNull();
  });

  test("confirms a dose without writing, then saves a backdated drink and returns a plain receipt", async () => {
    const input = { drink: "matcha", caffeineMg: 72, consumedAt: "09:15" };
    const proposal = await confirmation(input);
    expect(proposal?.info).toContainEqual({ name: "Caffeine", value: "72 mg (user supplied)" });
    expect(LocalStorage.setItem).not.toHaveBeenCalled();

    const receipt = await logCaffeineIntake(input);
    const timestamp = new Date(2026, 10, 19, 9, 15);
    expect(receipt).toMatchObject({
      drink: "Matcha",
      caffeineMg: 72,
      consumedAt: timestamp.toISOString(),
      servingMl: null,
    });
    expect(structuredClone(receipt)).toEqual(receipt);
    expect(await getIntakes()).toEqual([
      { id: receipt.id, timestamp, amount: 72, drinkType: "Matcha", amountDescription: undefined },
    ]);
    expect(LocalStorage.setItem).toHaveBeenCalledTimes(1);
  });

  test("rejects invalid dates, future logs, and missing doses before writing", async () => {
    await expect(logCaffeineIntake({ drink: "coffee", consumedAt: "16:00" })).rejects.toThrow(/past/);
    await expect(logCaffeineIntake({ drink: "coffee", consumedAt: "2026-02-30T09:00" })).rejects.toThrow(/ISO 8601/);
    await expect(logCaffeineIntake({ drink: "Mystery drink", servingMl: 240 })).rejects.toThrow(/milligrams/);
    await expect(logCaffeineIntake({ drink: "", caffeineMg: 60 })).rejects.toThrow(/drink name/);
    await expect(logCaffeineIntake({ drink: "coffee", caffeineMg: -1 })).rejects.toThrow(/positive/);
    await expect(logCaffeineIntake({ drink: "coffee", servingMl: -5 })).rejects.toThrow(/positive/);
    expect(LocalStorage.setItem).not.toHaveBeenCalled();
  });

  test("returns favorites by ID and lets a custom drink use its own default amount", async () => {
    storage.set("favorite-drinks", JSON.stringify(["oat-latte"]));
    storage.set("custom-drinks", JSON.stringify([{ id: "oat-latte", name: "Oat Latte", defaultCaffeineMg: 70 }]));

    expect(await listCaffeineDrinks({ favoritesOnly: true })).toEqual([
      { id: "oat-latte", name: "Oat Latte", servingMl: null, caffeineMg: 70, favorite: true },
    ]);
    await expect(previewCaffeine({ drink: "oat-latte", servingMl: 300 })).rejects.toThrow(/milligrams/);
    expect(await previewCaffeine({ drink: "oat-latte" })).toMatchObject({ caffeineMg: 70, servingMl: null });
  });

  test("uses the chart's date ranges and paginates intake entries only when requested", async () => {
    const intakes = Array.from({ length: 31 }, (_, index) => intake(String(index), 14 + (index % 5), index % 24, 10));
    storage.set("caffeine-intakes", JSON.stringify([...intakes, intake("old", 1, 10, 80)]));
    const summary = await getCaffeineHistory({ range: "week" });
    expect(summary.totalCaffeineMg).toBe(310);
    expect(summary.drinkCount).toBe(31);
    expect(summary.breakdown).toHaveLength(7);
    expect(summary).not.toHaveProperty("entries");
    const chart = new URL(summary.historyUrl);
    expect(chart.pathname).toBe("/atsushi_kawamura/no-more-caffeine/caffeine-history");
    expect(JSON.parse(chart.searchParams.get("context") ?? "")).toEqual({ range: "week" });

    const page = await getCaffeineHistory({ range: "week", includeEntries: true });
    expect(page).toMatchObject({ entries: expect.any(Array), nextOffset: 30 });
    expect(page).toHaveProperty("entries.length", 30);
    const last = await getCaffeineHistory({ range: "week", includeEntries: true, offset: 30 });
    expect(last).toHaveProperty("entries.length", 1);
    expect(last).toMatchObject({ nextOffset: null });
  });
});
