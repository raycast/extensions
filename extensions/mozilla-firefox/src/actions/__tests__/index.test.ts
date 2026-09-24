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
import { buildNewTabUrl, looksLikeUrl, newTabTitle, openNewTab, openInNewWindow } from "../index";

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

describe("newTabTitle", () => {
  it("treats blank input as Open Empty Tab", () => {
    expect(newTabTitle(undefined)).toBe("Open Empty Tab");
    expect(newTabTitle("")).toBe("Open Empty Tab");
    expect(newTabTitle("   ")).toBe("Open Empty Tab");
  });

  it("labels host-like input Open URL and the rest as Search", () => {
    expect(newTabTitle("github.com")).toBe("Open URL");
    expect(newTabTitle("whatsapp")).toBe('Search "whatsapp"');
  });
});

describe("looksLikeUrl", () => {
  it("accepts schemes, about:, hosts, localhost, and IPv4", () => {
    expect(looksLikeUrl("https://github.com/foo/1")).toBe(true);
    expect(looksLikeUrl("http://example.com")).toBe(true);
    expect(looksLikeUrl(" about:config ")).toBe(true);
    expect(looksLikeUrl("github.com/foo/2")).toBe(true);
    expect(looksLikeUrl("www.google.com")).toBe(true);
    expect(looksLikeUrl("localhost:3000")).toBe(true);
    expect(looksLikeUrl("127.0.0.1")).toBe(true);
  });

  it("rejects searches and file-like names", () => {
    expect(looksLikeUrl("whatsapp")).toBe(false);
    expect(looksLikeUrl("index.html")).toBe(false);
    expect(looksLikeUrl("node.js")).toBe(false);
    expect(looksLikeUrl("package.json")).toBe(false);
    expect(looksLikeUrl("foo.py")).toBe(false);
    expect(looksLikeUrl("app.rs")).toBe(false);
    expect(looksLikeUrl("data.csv")).toBe(false);
  });
});

describe("buildNewTabUrl", () => {
  it("opens about:newtab when the query is empty", () => {
    expect(buildNewTabUrl(null)).toBe("about:newtab");
    expect(buildNewTabUrl("   ")).toBe("about:newtab");
  });

  it("keeps absolute URLs and about: pages", () => {
    expect(buildNewTabUrl("https://github.com/foo/1")).toBe("https://github.com/foo/1");
    expect(buildNewTabUrl("http://example.com")).toBe("http://example.com");
    expect(buildNewTabUrl(" about:config ")).toBe("about:config");
  });

  it("prefixes https:// for host-like input", () => {
    expect(buildNewTabUrl("github.com/foo/2")).toBe("https://github.com/foo/2");
    expect(buildNewTabUrl("www.google.com")).toBe("https://www.google.com");
    expect(buildNewTabUrl("localhost:3000")).toBe("https://localhost:3000");
    expect(buildNewTabUrl("127.0.0.1")).toBe("https://127.0.0.1");
  });

  it("sends remaining text to the search engine", () => {
    expect(buildNewTabUrl("whatsapp")).toBe("https://google.com/search?q=whatsapp");
    expect(buildNewTabUrl("index.html")).toBe("https://google.com/search?q=index.html");
    expect(buildNewTabUrl("node.js")).toBe("https://google.com/search?q=node.js");
    expect(buildNewTabUrl("package.json")).toBe("https://google.com/search?q=package.json");
  });
});
