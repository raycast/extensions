import { beforeEach, describe, expect, it, vi } from "vitest";

const saved = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => saved.get(key),
    // A slow write leaves room for a second change to start before the first one is saved.
    setItem: async (key: string, value: string) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      saved.set(key, value);
    },
  },
}));

beforeEach(() => {
  saved.clear();
  vi.resetModules();
});

describe("store", () => {
  it("keeps both of two favorites added at the same time", async () => {
    const { toggleFavorite } = await import("../src/lib/store");
    await Promise.all([
      toggleFavorite({ orgnr: "923609016", name: "EQUINOR ASA" }),
      toggleFavorite({ orgnr: "984851006", name: "DNB BANK ASA" }),
    ]);
    const favorites = JSON.parse(saved.get("favourites") ?? "[]");
    expect(favorites.map((c: { orgnr: string }) => c.orgnr)).toEqual(["923609016", "984851006"]);
  });

  it("keeps every recent company tracked in quick succession", async () => {
    const { trackRecent } = await import("../src/lib/store");
    await Promise.all(["923609016", "984851006", "935108500"].map((orgnr) => trackRecent({ orgnr, name: orgnr })));
    const recents = JSON.parse(saved.get("recents") ?? "[]");
    expect(recents.map((c: { orgnr: string }) => c.orgnr)).toEqual(["935108500", "984851006", "923609016"]);
  });

  it("does not change favorites when the save fails", async () => {
    const { LocalStorage } = await import("@raycast/api");
    const setItem = vi.spyOn(LocalStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));
    const { toggleFavorite } = await import("../src/lib/store");
    await expect(toggleFavorite({ orgnr: "923609016", name: "EQUINOR ASA" })).rejects.toThrow("disk full");
    expect(saved.has("favourites")).toBe(false);
    setItem.mockRestore();
  });
});
