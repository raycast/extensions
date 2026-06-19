import { beforeEach, describe, expect, it, vi } from "vitest";
import { Browser, BrowserPlatform } from "@puppeteer/browsers";
import {
  getManagedBrowserMetadataPath,
  getManagedBrowserSupportRoot,
  installManagedBrowser,
  resolveCompatibleBrowser,
} from "../browser-manager";

describe("resolveCompatibleBrowser", () => {
  it("prefers environment browser paths over managed browser metadata", async () => {
    const result = await resolveCompatibleBrowser({
      supportPath: "/Support/Raycast",
      env: {
        PUPPETEER_EXECUTABLE_PATH: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      dependencies: {
        fileExists: vi.fn(
          (target: string) => target === "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        ),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        getInstalledBrowsers: vi.fn(),
        detectPlatform: vi.fn(),
        resolveBuildId: vi.fn(),
        installBrowser: vi.fn(),
        nowIsoString: vi.fn(),
      },
    });

    expect(result).toEqual({
      source: "environment",
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      version: undefined,
    });
  });

  it("uses managed browser metadata when no environment browser is available", async () => {
    const supportPath = "/Support/Raycast";
    const metadataPath = getManagedBrowserMetadataPath(supportPath);
    const result = await resolveCompatibleBrowser({
      supportPath,
      env: {},
      dependencies: {
        fileExists: vi.fn(
          (target: string) =>
            target === metadataPath ||
            target === "/Support/Raycast/browser-cache/chrome-headless-shell/custom/chrome-headless-shell",
        ),
        readFile: vi.fn(() =>
          JSON.stringify({
            executablePath: "/Support/Raycast/browser-cache/chrome-headless-shell/custom/chrome-headless-shell",
            version: "131.0.6778.204",
            installedAt: "2026-03-06T12:00:00.000Z",
          }),
        ),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        getInstalledBrowsers: vi.fn(),
        detectPlatform: vi.fn(),
        resolveBuildId: vi.fn(),
        installBrowser: vi.fn(),
        nowIsoString: vi.fn(),
      },
    });

    expect(result).toEqual({
      source: "managed",
      executablePath: "/Support/Raycast/browser-cache/chrome-headless-shell/custom/chrome-headless-shell",
      version: "131.0.6778.204",
    });
  });

  it("returns missing when neither environment nor managed browser is available", async () => {
    const result = await resolveCompatibleBrowser({
      supportPath: "/Support/Raycast",
      env: {},
      dependencies: {
        fileExists: vi.fn().mockReturnValue(false),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        getInstalledBrowsers: vi.fn().mockResolvedValue([]),
        detectPlatform: vi.fn(),
        resolveBuildId: vi.fn(),
        installBrowser: vi.fn(),
        nowIsoString: vi.fn(),
      },
    });

    expect(result).toEqual({ source: "missing" });
  });
});

describe("installManagedBrowser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes managed browser metadata after install", async () => {
    const writeFile = vi.fn();
    const installBrowser = vi.fn().mockResolvedValue({
      browser: Browser.CHROMEHEADLESSSHELL,
      executablePath: "/Support/Raycast/browser-cache/chrome-headless-shell/mac-131/chrome-headless-shell",
      buildId: "131.0.6778.204",
      path: "/Support/Raycast/browser-cache/chrome-headless-shell/mac-131",
    });

    const result = await installManagedBrowser({
      supportPath: "/Support/Raycast",
      dependencies: {
        fileExists: vi.fn().mockReturnValue(false),
        readFile: vi.fn(),
        writeFile,
        mkdir: vi.fn(),
        getInstalledBrowsers: vi.fn(),
        detectPlatform: vi.fn().mockReturnValue(BrowserPlatform.MAC_ARM),
        resolveBuildId: vi.fn().mockResolvedValue("131.0.6778.204"),
        installBrowser,
        nowIsoString: vi.fn().mockReturnValue("2026-03-06T12:34:56.000Z"),
      },
    });

    expect(installBrowser).toHaveBeenCalledWith(
      expect.objectContaining({
        browser: Browser.CHROMEHEADLESSSHELL,
        cacheDir: getManagedBrowserSupportRoot("/Support/Raycast"),
        buildId: "131.0.6778.204",
        platform: BrowserPlatform.MAC_ARM,
      }),
    );
    expect(writeFile).toHaveBeenCalledWith(
      getManagedBrowserMetadataPath("/Support/Raycast"),
      JSON.stringify(
        {
          executablePath: "/Support/Raycast/browser-cache/chrome-headless-shell/mac-131/chrome-headless-shell",
          version: "131.0.6778.204",
          installedAt: "2026-03-06T12:34:56.000Z",
        },
        null,
        2,
      ),
    );
    expect(result).toEqual({
      executablePath: "/Support/Raycast/browser-cache/chrome-headless-shell/mac-131/chrome-headless-shell",
      installRoot: "/Support/Raycast/browser-cache/chrome-headless-shell/mac-131",
      source: "managed",
      version: "131.0.6778.204",
    });
  });

  it("suppresses duplicate concurrent installs with a shared lock", async () => {
    let resolveInstall:
      | ((value: { browser: Browser; executablePath: string; buildId: string; path: string }) => void)
      | undefined;
    const installBrowser = vi.fn(
      () =>
        new Promise<{ browser: Browser; executablePath: string; buildId: string; path: string }>((resolve) => {
          resolveInstall = resolve;
        }),
    );
    const dependencies = {
      fileExists: vi.fn().mockReturnValue(false),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      getInstalledBrowsers: vi.fn(),
      detectPlatform: vi.fn().mockReturnValue(BrowserPlatform.MAC_ARM),
      resolveBuildId: vi.fn().mockResolvedValue("131.0.6778.204"),
      installBrowser,
      nowIsoString: vi.fn().mockReturnValue("2026-03-06T12:34:56.000Z"),
    };

    const firstInstall = installManagedBrowser({
      supportPath: "/Support/Raycast",
      dependencies,
    });
    const secondInstall = installManagedBrowser({
      supportPath: "/Support/Raycast",
      dependencies,
    });

    await Promise.resolve();
    await Promise.resolve();

    resolveInstall?.({
      browser: Browser.CHROMEHEADLESSSHELL,
      executablePath: "/Support/Raycast/browser-cache/chrome-headless-shell/mac-131/chrome-headless-shell",
      buildId: "131.0.6778.204",
      path: "/Support/Raycast/browser-cache/chrome-headless-shell/mac-131",
    });

    const [firstResult, secondResult] = await Promise.all([firstInstall, secondInstall]);

    expect(installBrowser).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(secondResult);
  });
});
