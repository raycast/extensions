import { beforeEach, describe, expect, test, vi } from "vitest";
import { LocalStorage } from "@raycast/api";
import { exportIntakes, parseIntakeExport } from "./intakeData";
import { deleteIntake, getIntakes, mergeIntakes, saveIntake, updateIntake } from "./storage";

const { storage } = vi.hoisted(() => ({ storage: new Map<string, string>() }));

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => storage.get(key)),
    setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
  },
}));

const legacyIntake = {
  id: "legacy",
  timestamp: new Date("2022-11-19T12:00:00.000Z"),
  amount: 95,
  drinkType: "Coffee",
  amountDescription: "240 mL",
};

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
});

describe("intake storage", () => {
  test("keeps legacy records older than 48 hours and performs no writes on read", async () => {
    storage.set("caffeine-intakes", JSON.stringify([legacyIntake]));
    expect(await getIntakes()).toEqual([legacyIntake]);
    expect(LocalStorage.setItem).not.toHaveBeenCalled();
    await updateIntake({ ...legacyIntake, amount: 100 });
    expect(await getIntakes()).toEqual([{ ...legacyIntake, amount: 100 }]);
    await deleteIntake(legacyIntake.id);
    expect(await getIntakes()).toEqual([]);
  });

  test("serializes overlapping writes and merges a backup without duplicating or replacing existing entries", async () => {
    const second = { ...legacyIntake, id: "second" };
    await Promise.all([saveIntake(legacyIntake), saveIntake(second)]);
    expect(await getIntakes()).toEqual([legacyIntake, second]);

    const incoming = { ...legacyIntake, id: "backup" };
    const backup = parseIntakeExport(exportIntakes([{ ...legacyIntake, amount: 300 }, incoming, incoming]));
    expect(await mergeIntakes(backup)).toBe(1);
    expect(await mergeIntakes(backup)).toBe(0);
    expect(await getIntakes()).toEqual([legacyIntake, second, incoming]);
  });

  test("rejects an invalid backup before writing history", () => {
    const file = JSON.stringify({ version: 1, intakes: [legacyIntake, { ...legacyIntake, timestamp: "bad" }] });
    expect(() => parseIntakeExport(file)).toThrow("Invalid timestamp");
    expect(LocalStorage.setItem).not.toHaveBeenCalled();
  });
});
