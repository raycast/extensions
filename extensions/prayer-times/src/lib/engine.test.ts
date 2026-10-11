import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stored: {} as Record<string, string>,
  locateCurrent: vi.fn(),
}));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({}),
  LocalStorage: {
    getItem: async (key: string) => mocks.stored[key],
    setItem: async (key: string, value: string) => {
      mocks.stored[key] = value;
    },
  },
  environment: {},
  launchCommand: vi.fn(),
  LaunchType: {},
}));
vi.mock("./helper", () => ({ locateCurrent: mocks.locateCurrent }));

import { refreshLocationIfDue } from "./engine";
import { buildSettings } from "./settings";

// Tests run with TZ=Asia/Karachi. Asr in Karachi on 8 October 2026 starts at 16:33.
const at = (h: number, m: number) => new Date(2026, 9, 8, h, m);
const settings = buildSettings({ mode: "current", latitude: 24.8607, longitude: 67.0011, label: "Karachi" });
const fix = { latitude: 24.86, longitude: 67.0, accuracy: 3000, locality: "Karachi", country: "Pakistan" };

beforeEach(() => {
  mocks.stored = {};
  mocks.locateCurrent.mockReset();
});

describe("refreshLocationIfDue", () => {
  it("retries a failed lookup after five minutes instead of giving up until the prayer starts", async () => {
    mocks.locateCurrent.mockRejectedValueOnce(new Error("timed out"));
    await refreshLocationIfDue(settings, at(16, 10));
    expect(mocks.locateCurrent).toHaveBeenCalledTimes(1);

    await refreshLocationIfDue(settings, at(16, 11));
    expect(mocks.locateCurrent).toHaveBeenCalledTimes(1);

    mocks.locateCurrent.mockResolvedValueOnce(fix);
    await refreshLocationIfDue(settings, at(16, 15));
    expect(mocks.locateCurrent).toHaveBeenCalledTimes(2);

    await refreshLocationIfDue(settings, at(16, 20));
    expect(mocks.locateCurrent).toHaveBeenCalledTimes(2);
  });

  it("does nothing for a chosen city", async () => {
    await refreshLocationIfDue(buildSettings({ ...settings.location, mode: "city" }), at(16, 10));
    expect(mocks.locateCurrent).not.toHaveBeenCalled();
  });
});
