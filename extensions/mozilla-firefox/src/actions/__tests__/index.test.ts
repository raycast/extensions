import { EventEmitter } from "events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({ browserApp: "Firefox", searchEngine: "Google" })),
  popToRoot: vi.fn(),
  closeMainWindow: vi.fn(),
  showToast: vi.fn(),
  Toast: { Style: { Failure: "FAILURE" } },
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("child_process", () => ({
  exec: vi.fn(),
  spawn: vi.fn(),
}));

import { getPreferenceValues, showToast } from "@raycast/api";
import { existsSync } from "fs";
import { spawn } from "child_process";

// Import after the mocks are in place so the module under test picks them up.
import { openNewTab } from "../index";

const setBrowserApp = (browserApp: string) =>
  vi.mocked(getPreferenceValues).mockReturnValue({ browserApp, searchEngine: "Google" });

// Makes existsSync resolve `true` only for the given set of paths.
const mockExistingPaths = (existingPaths: string[]) =>
  vi.mocked(existsSync).mockImplementation((candidate) => existingPaths.includes(String(candidate)));

// Simulates a Firefox process that spawns successfully.
const mockSpawnSuccess = () =>
  vi.mocked(spawn).mockImplementation(() => {
    const child = new EventEmitter() as never;
    (child as { unref: () => void }).unref = vi.fn();
    queueMicrotask(() => (child as EventEmitter).emit("spawn"));
    return child;
  });

describe("launchFirefox on Windows (via openNewTab)", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    vi.clearAllMocks();
  });

  it("spawns the release Firefox executable when found at a known install path", async () => {
    setBrowserApp("Firefox");
    mockExistingPaths(["C:\\Program Files\\Mozilla Firefox\\firefox.exe"]);
    mockSpawnSuccess();

    const result = await openNewTab(null);

    expect(result).toBe("success");
    expect(spawn).toHaveBeenCalledWith(
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      expect.any(Array),
      expect.anything(),
    );
  });

  it("falls back to the bare firefox.exe (PATH) for release Firefox when not found at known paths", async () => {
    setBrowserApp("Firefox");
    mockExistingPaths([]);
    mockSpawnSuccess();

    const result = await openNewTab(null);

    expect(result).toBe("success");
    expect(spawn).toHaveBeenCalledWith("firefox.exe", expect.any(Array), expect.anything());
  });

  it("spawns the Firefox Nightly executable when found at its known install path", async () => {
    setBrowserApp("Firefox Nightly");
    mockExistingPaths(["C:\\Program Files\\Firefox Nightly\\firefox.exe"]);
    mockSpawnSuccess();

    const result = await openNewTab(null);

    expect(result).toBe("success");
    expect(spawn).toHaveBeenCalledWith(
      "C:\\Program Files\\Firefox Nightly\\firefox.exe",
      expect.any(Array),
      expect.anything(),
    );
  });

  it("does not fall back to firefox.exe and shows an actionable error when Nightly is not found", async () => {
    setBrowserApp("Firefox Nightly");
    mockExistingPaths([]);
    mockSpawnSuccess();

    const result = await openNewTab(null);

    expect(result).toBe("error");
    expect(spawn).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "FAILURE",
        message: expect.stringContaining("Firefox Nightly"),
      }),
    );
  });

  it("does not fall back to firefox.exe and shows an actionable error when ESR is not found", async () => {
    setBrowserApp("Firefox ESR");
    mockExistingPaths([]);
    mockSpawnSuccess();

    const result = await openNewTab(null);

    expect(result).toBe("error");
    expect(spawn).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "FAILURE",
        message: expect.stringContaining("Firefox ESR"),
      }),
    );
  });

  it("does not fall back to firefox.exe and shows an actionable error when Developer Edition is not found", async () => {
    setBrowserApp("Firefox Developer Edition");
    mockExistingPaths([]);
    mockSpawnSuccess();

    const result = await openNewTab(null);

    expect(result).toBe("error");
    expect(spawn).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "FAILURE",
        message: expect.stringContaining("Firefox Developer Edition"),
      }),
    );
  });
});
