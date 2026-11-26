import { beforeEach, describe, expect, mock, test } from "bun:test";

const storageMap = new Map<string, string>();

mock.module("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => storageMap.get(key),
    setItem: async (key: string, value: string) => {
      storageMap.set(key, value);
    },
  },
  Cache: class {
    private data = new Map<string, string>();
    get(key: string) {
      return this.data.get(key);
    }
    set(key: string, value: string) {
      this.data.set(key, value);
    }
    remove(key: string) {
      this.data.delete(key);
    }
    clear() {
      this.data.clear();
    }
  },
  getPreferenceValues: () => ({
    apiHost: "https://live.sadaqahbox.apps.erklab.com",
    apiKey: "test-key",
  }),
}));

const {
  getPresets,
  addPreset,
  updatePreset,
  deletePreset,
  setDefaultPreset,
  unsetDefaultPreset,
  getDefaultPreset,
  movePresetUp,
  movePresetDown,
} = await import("../src/storage/presets-storage");

describe("presets-storage", () => {
  beforeEach(() => {
    storageMap.clear();
  });

  test("adds, updates, sets default, and deletes presets", async () => {
    const p1 = await addPreset("Daily", 5, "cur_usd", 1);
    const p2 = await addPreset("Friday", 20, "cur_usd", 2);

    expect((await getPresets()).map((p) => p.name)).toEqual(["Daily", "Friday"]);

    await setDefaultPreset(p2.id);
    expect((await getDefaultPreset())?.id).toBe(p2.id);

    await unsetDefaultPreset();
    expect(await getDefaultPreset()).toBeNull();

    await updatePreset(p1.id, { value: 10 });
    expect((await getPresets()).find((p) => p.id === p1.id)?.value).toBe(10);

    expect(await deletePreset(p1.id)).toBe(true);
    expect((await getPresets()).map((p) => p.id)).toEqual([p2.id]);
  });

  test("reorders legacy presets that lack an order field", async () => {
    storageMap.set(
      "sadaqah-presets",
      JSON.stringify([
        { id: "1", name: "First", value: 1, currencyId: "usd", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "2", name: "Second", value: 2, currencyId: "usd", createdAt: "2026-01-02T00:00:00.000Z" },
      ]),
    );

    expect(await movePresetDown("1")).toBe(true);
    expect((await getPresets()).map((p) => p.id)).toEqual(["2", "1"]);

    expect(await movePresetUp("1")).toBe(true);
    expect((await getPresets()).map((p) => p.id)).toEqual(["1", "2"]);
  });

  test("recovers gracefully from corrupted or invalid storage entries", async () => {
    storageMap.set("sadaqah-presets", "{not-json");
    expect(await getPresets()).toEqual([]);

    storageMap.set(
      "sadaqah-presets",
      JSON.stringify([
        { bad: true },
        { id: "ok", name: "Valid", value: 5, currencyId: "usd", createdAt: "2026-01-01T00:00:00.000Z" },
      ]),
    );
    expect((await getPresets()).map((p) => p.id)).toEqual(["ok"]);
  });
});
