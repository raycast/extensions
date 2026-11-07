import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, unknown>());

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    setItem: vi.fn(async (key: string, value: unknown) => void storage.set(key, value)),
    getItem: vi.fn(async (key: string) => storage.get(key)),
  },
}));

import { stepVolume, toggleMuteVolume } from "../volume";

describe("stepVolume", () => {
  it("steps by 10% and clamps to [0, 1]", () => {
    expect(stepVolume(0.5, 1)).toBe(0.6);
    expect(stepVolume(0.95, 1)).toBe(1);
    expect(stepVolume(0.05, -1)).toBe(0);
  });
});

describe("toggleMuteVolume", () => {
  beforeEach(() => storage.clear());

  it("mutes and restores the previous volume", async () => {
    expect(await toggleMuteVolume(0.7)).toBe(0);
    expect(await toggleMuteVolume(0)).toBe(0.7);
  });

  it("falls back to 50% when no previous volume is stored", async () => {
    expect(await toggleMuteVolume(0)).toBe(0.5);
  });
});
