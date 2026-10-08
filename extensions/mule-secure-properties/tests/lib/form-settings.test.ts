import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  environment: {
    supportPath: "/tmp/mule-secure-properties",
  },
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

import { LocalStorage } from "@raycast/api";
import { buildFormSettings, DEFAULT_FORM_SETTINGS, loadFormSettings, saveFormSettings } from "../../src/utils";

describe("buildFormSettings", () => {
  it("returns defaults when given an empty partial", () => {
    expect(buildFormSettings({})).toEqual(DEFAULT_FORM_SETTINGS);
  });

  it("merges partial updates onto previous settings", () => {
    expect(
      buildFormSettings(
        { algorithm: "Blowfish", mode: "CFB", useRandomIV: true },
        {
          algorithm: "AES",
          mode: "CBC",
          useRandomIV: false,
          wrapOutput: false,
          stripWrapper: false,
        },
      ),
    ).toEqual({
      algorithm: "Blowfish",
      mode: "CFB",
      useRandomIV: true,
      wrapOutput: false,
      stripWrapper: false,
    });
  });
});

describe("loadFormSettings / saveFormSettings", () => {
  beforeEach(() => {
    vi.mocked(LocalStorage.getItem).mockReset();
    vi.mocked(LocalStorage.setItem).mockReset();
  });

  it("loads defaults when empty", async () => {
    vi.mocked(LocalStorage.getItem).mockResolvedValue(undefined);
    await expect(loadFormSettings()).resolves.toEqual(DEFAULT_FORM_SETTINGS);
  });

  it("loads parsed settings", async () => {
    const stored = {
      algorithm: "Blowfish",
      mode: "CFB",
      useRandomIV: true,
      wrapOutput: false,
      stripWrapper: false,
    };
    vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(stored));
    await expect(loadFormSettings()).resolves.toEqual(stored);
  });

  it("saves JSON without requiring React state updates", async () => {
    const settings = { ...DEFAULT_FORM_SETTINGS, algorithm: "Blowfish" };
    await saveFormSettings(settings);
    expect(LocalStorage.setItem).toHaveBeenCalledWith("secure-properties-form", JSON.stringify(settings));
  });
});
