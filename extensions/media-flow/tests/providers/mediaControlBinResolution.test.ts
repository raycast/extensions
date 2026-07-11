import { afterEach, describe, expect, it, vi } from "vitest";

// MEDIA_CONTROL_BIN is resolved once at module load, so each scenario needs a fresh
// module graph with node:fs mocked before the import happens.
afterEach(() => {
  vi.resetModules();
  vi.doUnmock("node:fs");
});

async function loadBinWith(existing: string[]): Promise<string> {
  vi.doMock("node:fs", () => ({ existsSync: (p: string) => existing.includes(p) }));
  const mod = await import("../../src/providers/mediaControl");
  return mod.MEDIA_CONTROL_BIN;
}

describe("MEDIA_CONTROL_BIN resolution", () => {
  it("prefers /opt/homebrew/bin when present", async () => {
    expect(await loadBinWith(["/opt/homebrew/bin/media-control", "/usr/local/bin/media-control"])).toBe(
      "/opt/homebrew/bin/media-control",
    );
  });

  it("falls back to /usr/local/bin when homebrew-arm path is absent", async () => {
    expect(await loadBinWith(["/usr/local/bin/media-control"])).toBe("/usr/local/bin/media-control");
  });

  it("falls back to bare binary name when neither absolute path exists", async () => {
    expect(await loadBinWith([])).toBe("media-control");
  });
});
