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

import { closeMainWindow, getPreferenceValues, popToRoot, showToast } from "@raycast/api";
import { existsSync } from "fs";
import { spawn } from "child_process";

// Import after the mocks are in place so the module under test picks them up.
import { openNewTab, openInNewWindow } from "../index";

const setBrowserApp = (browserApp: string) =>
  vi.mocked(getPreferenceValues).mockReturnValue({ browserApp, searchEngine: "Google" });

async function withLocalAppData<T>(value: string, run: () => Promise<T>): Promise<T> {
  const original = process.env.LOCALAPPDATA;
  process.env.LOCALAPPDATA = value;
  try {
    return await run();
  } finally {
    if (original === undefined) {
      delete process.env.LOCALAPPDATA;
    } else {
      process.env.LOCALAPPDATA = original;
    }
  }
}

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
      ["about:newtab"],
      expect.anything(),
    );
  });

  it("does not fall back to firefox.exe and shows an actionable error when release Firefox is not found", async () => {
    setBrowserApp("Firefox");
    mockExistingPaths([]);
    mockSpawnSuccess();

    const result = await openNewTab(null);

    expect(result).toBe("error");
    expect(spawn).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "FAILURE",
        message: expect.stringContaining("Firefox"),
      }),
    );
  });

  it("spawns the per-user LocalAppData Firefox executable when Program Files is missing", async () => {
    await withLocalAppData("C:\\Users\\TestUser\\AppData\\Local", async () => {
      setBrowserApp("Firefox");
      mockExistingPaths(["C:\\Users\\TestUser\\AppData\\Local\\Mozilla Firefox\\firefox.exe"]);
      mockSpawnSuccess();

      const result = await openNewTab(null);

      expect(result).toBe("success");
      expect(spawn).toHaveBeenCalledWith(
        "C:\\Users\\TestUser\\AppData\\Local\\Mozilla Firefox\\firefox.exe",
        ["about:newtab"],
        expect.anything(),
      );
    });
  });

  it("spawns Firefox from LocalAppData\\Programs when the top-level LocalAppData install is missing", async () => {
    await withLocalAppData("C:\\Users\\TestUser\\AppData\\Local", async () => {
      setBrowserApp("Firefox");
      mockExistingPaths(["C:\\Users\\TestUser\\AppData\\Local\\Programs\\Mozilla Firefox\\firefox.exe"]);
      mockSpawnSuccess();

      const result = await openNewTab(null);

      expect(result).toBe("success");
      expect(spawn).toHaveBeenCalledWith(
        "C:\\Users\\TestUser\\AppData\\Local\\Programs\\Mozilla Firefox\\firefox.exe",
        ["about:newtab"],
        expect.anything(),
      );
    });
  });

  it("spawns the Firefox Nightly executable when found at its known install path", async () => {
    setBrowserApp("Firefox Nightly");
    mockExistingPaths(["C:\\Program Files\\Firefox Nightly\\firefox.exe"]);
    mockSpawnSuccess();

    const result = await openNewTab(null);

    expect(result).toBe("success");
    expect(spawn).toHaveBeenCalledWith(
      "C:\\Program Files\\Firefox Nightly\\firefox.exe",
      ["about:newtab"],
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

describe("openInNewWindow on Windows", () => {
  const originalPlatform = process.platform;
  const exampleUrl = "https://example.com";

  beforeEach(() => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    vi.clearAllMocks();
  });

  it("spawns Firefox with -new-window and the destination URL", async () => {
    setBrowserApp("Firefox");
    mockExistingPaths(["C:\\Program Files\\Mozilla Firefox\\firefox.exe"]);
    mockSpawnSuccess();

    const result = await openInNewWindow(exampleUrl);

    expect(result).toBe("success");
    expect(spawn).toHaveBeenCalledWith(
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      ["-new-window", exampleUrl],
      expect.anything(),
    );
  });

  it("dismisses Raycast via popToRoot and closeMainWindow on success", async () => {
    setBrowserApp("Firefox");
    mockExistingPaths(["C:\\Program Files\\Mozilla Firefox\\firefox.exe"]);
    mockSpawnSuccess();

    await openInNewWindow(exampleUrl);

    expect(popToRoot).toHaveBeenCalled();
    expect(closeMainWindow).toHaveBeenCalledWith({ clearRootSearch: true });
  });

  it("shows Failed to open Firefox when the executable is missing", async () => {
    setBrowserApp("Firefox Nightly");
    mockExistingPaths([]);
    mockSpawnSuccess();

    const result = await openInNewWindow(exampleUrl);

    expect(result).toBe("error");
    expect(spawn).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "FAILURE",
        title: "Failed to open Firefox",
      }),
    );
    expect(popToRoot).not.toHaveBeenCalled();
    expect(closeMainWindow).not.toHaveBeenCalled();
  });

  it("shows Failed to open Firefox when spawn fails", async () => {
    setBrowserApp("Firefox");
    mockExistingPaths(["C:\\Program Files\\Mozilla Firefox\\firefox.exe"]);
    vi.mocked(spawn).mockImplementation(() => {
      const child = new EventEmitter() as never;
      (child as { unref: () => void }).unref = vi.fn();
      queueMicrotask(() => (child as EventEmitter).emit("error", new Error("spawn ENOENT")));
      return child;
    });

    const result = await openInNewWindow(exampleUrl);

    expect(result).toBe("error");
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "FAILURE",
        title: "Failed to open Firefox",
      }),
    );
    expect(popToRoot).not.toHaveBeenCalled();
    expect(closeMainWindow).not.toHaveBeenCalled();
  });

  it("spawns about:newtab when the destination is empty", async () => {
    setBrowserApp("Firefox");
    mockExistingPaths(["C:\\Program Files\\Mozilla Firefox\\firefox.exe"]);
    mockSpawnSuccess();

    const result = await openInNewWindow(null);

    expect(result).toBe("success");
    expect(spawn).toHaveBeenCalledWith(
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      ["-new-window", "about:newtab"],
      expect.anything(),
    );
  });
});
