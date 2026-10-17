import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import {
  Browser,
  BrowserPlatform,
  BrowserTag,
  detectBrowserPlatform,
  getInstalledBrowsers,
  install,
  resolveBuildId,
  type GetInstalledBrowsersOptions,
  type InstallOptions,
  type InstalledBrowser,
} from "@puppeteer/browsers";
import { ManagedBrowserInstallError } from "./browser-errors";
import { logOperationalError, logOperationalEvent } from "./logger";

export type CompatibleBrowserSource = "environment" | "managed" | "missing";

export interface CompatibleBrowserResolution {
  source: CompatibleBrowserSource;
  executablePath?: string;
  version?: string;
}

export interface ManagedBrowserInstallResult extends CompatibleBrowserResolution {
  source: "managed";
  executablePath: string;
  version: string;
  installRoot: string;
}

interface ManagedBrowserMetadata {
  executablePath: string;
  version: string;
  installedAt: string;
}

interface InstalledBrowserLike {
  browser: Browser;
  buildId: string;
  executablePath: string;
  path: string;
}

interface BrowserManagerDependencies {
  fileExists: (targetPath: string) => boolean;
  readFile: (targetPath: string) => string;
  writeFile: (targetPath: string, content: string) => void;
  mkdir: (targetPath: string) => Promise<void> | void;
  getInstalledBrowsers: (options: GetInstalledBrowsersOptions) => Promise<InstalledBrowserLike[]>;
  detectPlatform: () => BrowserPlatform | undefined;
  resolveBuildId: (browser: Browser, platform: BrowserPlatform, tag: BrowserTag) => Promise<string>;
  installBrowser: (options: InstallOptions) => Promise<InstalledBrowserLike>;
  nowIsoString: () => string;
}

interface ResolveCompatibleBrowserOptions {
  supportPath?: string;
  env?: NodeJS.ProcessEnv;
  dependencies?: BrowserManagerDependencies;
}

interface InstallManagedBrowserOptions {
  supportPath?: string;
  onProgress?: (downloadedBytes: number, totalBytes: number) => void;
  dependencies?: BrowserManagerDependencies;
}

function createBrowserManagerDependencies(): BrowserManagerDependencies {
  return {
    fileExists: fs.existsSync,
    readFile: (targetPath) => fs.readFileSync(targetPath, "utf-8"),
    writeFile: (targetPath, content) => fs.writeFileSync(targetPath, content),
    mkdir: async (targetPath) => {
      await fs.promises.mkdir(targetPath, { recursive: true });
    },
    getInstalledBrowsers: (options) => getInstalledBrowsers(options) as Promise<InstalledBrowser[]>,
    detectPlatform: detectBrowserPlatform,
    resolveBuildId: (browser, platform, tag) => resolveBuildId(browser, platform, tag),
    installBrowser: (options) => install(options as InstallOptions & { unpack?: true }) as Promise<InstalledBrowser>,
    nowIsoString: () => new Date().toISOString(),
  };
}

export function getManagedBrowserSupportRoot(supportPath = environment.supportPath): string {
  return path.join(supportPath, "browser-cache", "chrome-headless-shell");
}

export function getManagedBrowserMetadataPath(supportPath = environment.supportPath): string {
  return path.join(getManagedBrowserSupportRoot(supportPath), "managed-browser.json");
}

function getEnvironmentBrowserCandidates(env: NodeJS.ProcessEnv): string[] {
  return [
    env.PUPPETEER_EXECUTABLE_PATH,
    env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  ].filter((candidate): candidate is string => Boolean(candidate));
}

function isManagedBrowserMetadata(value: unknown): value is ManagedBrowserMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const metadata = value as Partial<ManagedBrowserMetadata>;
  return (
    typeof metadata.executablePath === "string" &&
    typeof metadata.version === "string" &&
    typeof metadata.installedAt === "string"
  );
}

function readManagedBrowserMetadata(
  supportPath: string,
  dependencies: BrowserManagerDependencies,
): ManagedBrowserMetadata | null {
  const metadataPath = getManagedBrowserMetadataPath(supportPath);
  if (!dependencies.fileExists(metadataPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(dependencies.readFile(metadataPath)) as unknown;
    if (isManagedBrowserMetadata(parsed)) {
      return parsed;
    }
  } catch (error) {
    logOperationalError("read-managed-browser-metadata-failed", error, { path: metadataPath });
  }

  return null;
}

function writeManagedBrowserMetadata(
  supportPath: string,
  metadata: ManagedBrowserMetadata,
  dependencies: BrowserManagerDependencies,
): void {
  dependencies.writeFile(getManagedBrowserMetadataPath(supportPath), JSON.stringify(metadata, null, 2));
}

async function recoverManagedBrowserFromCache(
  supportPath: string,
  dependencies: BrowserManagerDependencies,
): Promise<CompatibleBrowserResolution | null> {
  try {
    const installedBrowsers = await dependencies.getInstalledBrowsers({
      cacheDir: getManagedBrowserSupportRoot(supportPath),
    });
    const managedBrowser = installedBrowsers.find((browser) => browser.browser === Browser.CHROMEHEADLESSSHELL);
    if (!managedBrowser || !dependencies.fileExists(managedBrowser.executablePath)) {
      return null;
    }

    writeManagedBrowserMetadata(
      supportPath,
      {
        executablePath: managedBrowser.executablePath,
        version: managedBrowser.buildId,
        installedAt: dependencies.nowIsoString(),
      },
      dependencies,
    );

    return {
      source: "managed",
      executablePath: managedBrowser.executablePath,
      version: managedBrowser.buildId,
    };
  } catch (error) {
    logOperationalError("recover-managed-browser-from-cache-failed", error, {
      path: getManagedBrowserSupportRoot(supportPath),
    });
    return null;
  }
}

export async function resolveCompatibleBrowser(
  options: ResolveCompatibleBrowserOptions = {},
): Promise<CompatibleBrowserResolution> {
  const supportPath = options.supportPath ?? environment.supportPath;
  const env = options.env ?? process.env;
  const dependencies = options.dependencies ?? createBrowserManagerDependencies();

  for (const candidate of getEnvironmentBrowserCandidates(env)) {
    if (dependencies.fileExists(candidate)) {
      logOperationalEvent("compatible-browser-resolved", { source: "environment" });
      return {
        source: "environment",
        executablePath: candidate,
      };
    }
  }

  const metadata = readManagedBrowserMetadata(supportPath, dependencies);
  if (metadata && dependencies.fileExists(metadata.executablePath)) {
    logOperationalEvent("compatible-browser-resolved", { source: "managed" });
    return {
      source: "managed",
      executablePath: metadata.executablePath,
      version: metadata.version,
    };
  }

  const recoveredManagedBrowser = await recoverManagedBrowserFromCache(supportPath, dependencies);
  if (recoveredManagedBrowser) {
    logOperationalEvent("compatible-browser-resolved", { source: "managed" });
    return recoveredManagedBrowser;
  }

  logOperationalEvent("compatible-browser-resolved", { source: "missing" });
  return { source: "missing" };
}

let managedBrowserInstallPromise: Promise<ManagedBrowserInstallResult> | null = null;

export async function installManagedBrowser(
  options: InstallManagedBrowserOptions = {},
): Promise<ManagedBrowserInstallResult> {
  if (managedBrowserInstallPromise) {
    return await managedBrowserInstallPromise;
  }

  const supportPath = options.supportPath ?? environment.supportPath;
  const dependencies = options.dependencies ?? createBrowserManagerDependencies();

  managedBrowserInstallPromise = (async () => {
    const cacheDir = getManagedBrowserSupportRoot(supportPath);

    try {
      await dependencies.mkdir(cacheDir);

      const platform = dependencies.detectPlatform();
      if (!platform) {
        throw new ManagedBrowserInstallError("This Mac could not be matched to a supported browser platform.");
      }

      const buildId = await dependencies.resolveBuildId(Browser.CHROMEHEADLESSSHELL, platform, BrowserTag.STABLE);
      logOperationalEvent("managed-browser-install-started", {
        source: "managed",
        version: buildId,
      });

      const installedBrowser = await dependencies.installBrowser({
        browser: Browser.CHROMEHEADLESSSHELL,
        buildId,
        cacheDir,
        platform,
        downloadProgressCallback: options.onProgress,
      });

      const metadata: ManagedBrowserMetadata = {
        executablePath: installedBrowser.executablePath,
        version: buildId,
        installedAt: dependencies.nowIsoString(),
      };
      writeManagedBrowserMetadata(supportPath, metadata, dependencies);

      logOperationalEvent("managed-browser-install-finished", {
        source: "managed",
        version: buildId,
      });

      return {
        source: "managed",
        executablePath: installedBrowser.executablePath,
        version: buildId,
        installRoot: installedBrowser.path,
      };
    } catch (error) {
      logOperationalError("managed-browser-install-failed", error, { source: "managed" });
      if (error instanceof ManagedBrowserInstallError) {
        throw error;
      }
      throw new ManagedBrowserInstallError(
        `Failed to download the managed browser: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    } finally {
      managedBrowserInstallPromise = null;
    }
  })();

  return await managedBrowserInstallPromise;
}
