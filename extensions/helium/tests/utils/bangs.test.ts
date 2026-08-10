import { afterEach, describe, expect, it, vi } from "vitest";

const bangsJson = JSON.stringify([{ s: "Example", ts: ["ex"], u: "https://example.com/search?q={searchTerms}" }]);

describe("bang index cache", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("keys cached bang indexes by services origin", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => bangsJson }));
    vi.stubGlobal("fetch", fetchMock);
    const { getBangIndex } = await import("../../src/utils/bangs");

    await getBangIndex("https://services.helium.imput.net");
    await getBangIndex("https://custom.example");
    await getBangIndex("https://services.helium.imput.net");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://services.helium.imput.net/bangs.json",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://custom.example/bangs.json", expect.any(Object));
  });
});
