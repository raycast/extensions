/**
 * Integration tests for WinGet CLI wrapper.
 *
 * These tests run actual winget commands on the system with real packages.
 * They are sequential because Windows can only run one installer at a time.
 *
 * Test package: jqlang.jq
 * - Tiny CLI tool (~2MB), installs in ~3s, no UAC prompts
 * - Has multiple versions for version/upgrade testing
 *
 * IMPORTANT:
 * - Tests clean up before AND after to ensure consistent state
 * - Tests are sequential - do not run in parallel
 * - Tests FAIL if operations fail (no skipping)
 *
 * Run with: npm run test:integration
 */

import { access, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  downloadInstaller,
  exportPackages,
  importPackages,
  installPackage,
  installPackageVersion,
  isWingetAvailable,
  listInstalledPackages as listInstalledRaw,
  listPinnedPackages as listPinnedRaw,
  listUpgradePackages as listUpgradesRaw,
  pinPackage,
  repairPackage,
  searchAllPackages as searchAllRaw,
  showPackageDetails,
  showPackageVersions,
  uninstallPackage,
  unpinPackage,
  upgradePackage,
} from "./commands";
import { type WingetProgressState } from "./types";

// The table queries return {items, stats}; these tests only assert on items.
const listInstalledPackages = async () => (await listInstalledRaw()).items;
const listPinnedPackages = async () => (await listPinnedRaw()).items;
const listUpgradePackages = async () => (await listUpgradesRaw()).items;
const searchAllPackages = async () => (await searchAllRaw()).items;

const isWindows = process.platform === "win32";

// Test package: jq - tiny CLI tool, fast install, no UAC, multiple versions available
const TEST_PACKAGE = { id: "jqlang.jq", name: "jq", source: "winget" as const };

// Large, reliable package for progress-state testing
const PROGRESS_PACKAGE = {
  id: "VideoLAN.VLC",
  name: "VLC",
  source: "winget" as const,
};

async function ensurePackageRemoved(packageId: string, source: "winget" | "msstore" = "winget"): Promise<void> {
  await unpinPackage(packageId, source).catch(() => {});
  await uninstallPackage(packageId, source).catch(() => {});
  await sleep(2000);
}

async function ensurePackageInstalled(packageId: string, source: "winget" | "msstore" = "winget"): Promise<void> {
  const installed = await listInstalledPackages();
  if (installed.some((p) => p.id === packageId)) return;
  const result = await installPackage(packageId, source);
  if (!result.success) throw new Error(`Failed to install ${packageId}: ${result.message}`);
  await sleep(2000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasState(states: WingetProgressState[], type: WingetProgressState["type"]): boolean {
  return states.some((s) => s.type === type);
}

function firstIndexOfState(states: WingetProgressState[], type: WingetProgressState["type"]): number {
  return states.findIndex((s) => s.type === type);
}

/**
 * Compare a catalog version with an installed (registry-reported) version the
 * way winget does: segment by segment, with missing segments read as zero —
 * VLC's catalog says "3.0.23" while its installed entry reports "3.0.23.0".
 */
function sameWingetVersion(a: string, b: string): boolean {
  const segmentsA = a.split(".");
  const segmentsB = b.split(".");
  const length = Math.max(segmentsA.length, segmentsB.length);
  for (let i = 0; i < length; i++) {
    const segA = segmentsA[i] ?? "0";
    const segB = segmentsB[i] ?? "0";
    if (segA === segB) continue;
    const numA = Number(segA);
    const numB = Number(segB);
    if (Number.isNaN(numA) || Number.isNaN(numB) || numA !== numB) {
      return false;
    }
  }
  return true;
}

function isNoUpgradeMessage(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("no available upgrade") || lower.includes("no newer package versions");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// All tests are sequential — Windows can only run one installer at a time
// ---------------------------------------------------------------------------

describe.skipIf(!isWindows)("WinGet CLI Integration Tests", () => {
  beforeAll(async () => {
    const available = await isWingetAvailable();
    if (!available) throw new Error("WinGet is not available on this system");
  });

  // ==========================================================================
  // SECTION 1: Query Commands
  // ==========================================================================

  describe("Query Commands", () => {
    it("searchAllPackages returns thousands of packages with correct structure", async () => {
      const packages = await searchAllPackages();

      expect(packages.length).toBeGreaterThan(1000);

      const pkg = packages[0];
      expect(pkg).toBeDefined();
      expect(pkg!.id).toBeTruthy();
      expect(pkg!.name).toBeTruthy();
      expect(pkg!.version).toBeTruthy();
      expect(["winget", "msstore"]).toContain(pkg!.source);

      const jq = packages.find((p) => p.id === TEST_PACKAGE.id);
      expect(jq).toBeDefined();
      expect(jq!.source).toBe("winget");
    }, 120_000);

    it("searchAllPackages preserves Unicode package names", async () => {
      const packages = await searchAllPackages();
      const unicodePackages = packages.filter((pkg) => [...pkg.name].some((char) => (char.codePointAt(0) ?? 0) > 0x7f));
      expect(unicodePackages.length).toBeGreaterThan(0);
      for (const pkg of unicodePackages.slice(0, 5)) {
        expect(pkg.name).not.toContain("\uFFFD");
      }
    }, 120_000);

    it("listInstalledPackages returns only winget/msstore packages", async () => {
      const packages = await listInstalledPackages();
      expect(Array.isArray(packages)).toBe(true);

      for (const pkg of packages) {
        expect(["winget", "msstore"]).toContain(pkg.source);
        expect(pkg.id).toBeTruthy();
        expect(pkg.id).not.toContain("ARP\\");
      }
    }, 180_000);

    it("listUpgradePackages returns packages with available versions", async () => {
      const packages = await listUpgradePackages();
      expect(Array.isArray(packages)).toBe(true);

      for (const pkg of packages) {
        expect(pkg.available).toBeTruthy();
        expect(["winget", "msstore"]).toContain(pkg.source);
      }
    }, 180_000);

    it("listPinnedPackages returns valid entries", async () => {
      const packages = await listPinnedPackages();
      expect(Array.isArray(packages)).toBe(true);
      for (const pkg of packages) {
        expect(pkg.id).toBeTruthy();
      }
    }, 120_000);

    it("showPackageDetails returns full metadata for jq", async () => {
      const details = await showPackageDetails(TEST_PACKAGE.id, TEST_PACKAGE.source);
      expect(details).not.toBeNull();
      expect(details!.id).toBe(TEST_PACKAGE.id);
      expect(details!.version).toBeTruthy();
      expect(details!.publisher).toBeTruthy();
      expect(details!.description).toBeTruthy();
    }, 120_000);

    it("showPackageDetails returns null for non-existent package", async () => {
      const details = await showPackageDetails("NonExistent.Package.12345", "winget");
      expect(details).toBeNull();
    }, 120_000);

    it("showPackageVersions returns multiple versions for jq", async () => {
      const versionList = await showPackageVersions(TEST_PACKAGE.id, TEST_PACKAGE.source);
      expect(versionList).not.toBeNull();
      expect(versionList!.id).toBe(TEST_PACKAGE.id);
      expect(versionList!.versions.length).toBeGreaterThan(1);

      for (const version of versionList!.versions) {
        expect(version).toMatch(/^\d+\.\d+/);
      }

      const unique = new Set(versionList!.versions);
      expect(unique.size).toBe(versionList!.versions.length);
    }, 120_000);

    it("does not block fast queries behind a slow catalog query", async () => {
      let searchResolved = false;

      const searchPromise = searchAllPackages().then((r) => {
        searchResolved = true;
        return r;
      });

      await sleep(200);

      // Read-only queries share concurrent slots: the pin query must resolve
      // while the multi-minute catalog search is still running.
      const pinned = await listPinnedPackages();
      expect(Array.isArray(pinned)).toBe(true);
      expect(searchResolved).toBe(false);

      const search = await searchPromise;
      expect(search.length).toBeGreaterThan(0);
    }, 120_000);
  });

  // ==========================================================================
  // SECTION 2: Install/Uninstall Lifecycle
  // ==========================================================================

  describe("Install/Uninstall Lifecycle", () => {
    beforeAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 180_000);

    afterAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 180_000);

    it("installPackage installs jq and emits progress states", async () => {
      let installed = await listInstalledPackages();
      expect(installed.find((p) => p.id === TEST_PACKAGE.id)).toBeUndefined();

      const progressStates: WingetProgressState[] = [];
      const result = await installPackage(TEST_PACKAGE.id, TEST_PACKAGE.source, {
        onProgress: (state) => progressStates.push(state),
      });

      expect(result.success).toBe(true);
      expect(progressStates.length).toBeGreaterThan(0);

      const types = progressStates.map((s) => s.type);
      expect(types.includes("initializing") || types.includes("downloading") || types.includes("installing")).toBe(
        true,
      );

      installed = await listInstalledPackages();
      const jq = installed.find((p) => p.id === TEST_PACKAGE.id);
      expect(jq).toBeDefined();
      expect(jq!.version).toBeTruthy();
      expect(jq!.source).toBe("winget");
    }, 180_000);

    it("uninstallPackage removes jq", async () => {
      let installed = await listInstalledPackages();
      expect(installed.find((p) => p.id === TEST_PACKAGE.id)).toBeDefined();

      const result = await uninstallPackage(TEST_PACKAGE.id, TEST_PACKAGE.source);
      expect(result.success).toBe(true);

      await sleep(1000);

      installed = await listInstalledPackages();
      expect(installed.find((p) => p.id === TEST_PACKAGE.id)).toBeUndefined();
    }, 120_000);
  });

  // ==========================================================================
  // SECTION 3: Install Specific Version with Auto-Pin
  // ==========================================================================

  describe("Install Specific Version", () => {
    beforeAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 180_000);

    afterAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 180_000);

    it("installPackageVersion installs older version and adds blocking pin", async () => {
      const versionList = await showPackageVersions(TEST_PACKAGE.id, TEST_PACKAGE.source);
      expect(versionList).not.toBeNull();
      expect(versionList!.versions.length).toBeGreaterThan(1);

      const targetVersion = versionList!.versions[1]!;

      const progressStates: WingetProgressState[] = [];
      const result = await installPackageVersion(TEST_PACKAGE.id, targetVersion, TEST_PACKAGE.source, {
        onProgress: (state) => progressStates.push(state),
      });

      expect(result.success).toBe(true);
      expect(progressStates.length).toBeGreaterThan(0);

      const installed = await listInstalledPackages();
      const jq = installed.find((p) => p.id === TEST_PACKAGE.id);
      expect(jq).toBeDefined();
      expect(sameWingetVersion(jq!.version, targetVersion)).toBe(true);

      const pinned = await listPinnedPackages();
      const jqPin = pinned.find((p) => p.id === TEST_PACKAGE.id);
      expect(jqPin).toBeDefined();
    }, 120_000);
  });

  // ==========================================================================
  // SECTION 4: Upgrade Package
  // ==========================================================================

  describe("Upgrade Package", () => {
    beforeAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 180_000);

    afterAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 180_000);

    it("upgradePackage upgrades from older version to latest", async () => {
      const versionList = await showPackageVersions(TEST_PACKAGE.id, TEST_PACKAGE.source);
      expect(versionList).not.toBeNull();
      expect(versionList!.versions.length).toBeGreaterThan(1);

      const latestVersion = versionList!.versions[0]!;
      const olderVersion = versionList!.versions[1]!;

      await installPackageVersion(TEST_PACKAGE.id, olderVersion, TEST_PACKAGE.source);
      await unpinPackage(TEST_PACKAGE.id, TEST_PACKAGE.source);
      await sleep(1000);

      let installedVersion: string;
      {
        const installed = await listInstalledPackages();
        const jq = installed.find((p) => p.id === TEST_PACKAGE.id);
        expect(jq).toBeDefined();
        installedVersion = jq!.version;
      }

      const shouldHaveUpgradePath = installedVersion !== latestVersion;

      if (shouldHaveUpgradePath) {
        const upgrades = await listUpgradePackages();
        const jqUpgrade = upgrades.find((p) => p.id === TEST_PACKAGE.id);
        expect(jqUpgrade).toBeDefined();
        expect(jqUpgrade!.available).toBe(latestVersion);
      }

      const progressStates: WingetProgressState[] = [];
      const upgradeResult = await upgradePackage(TEST_PACKAGE.id, TEST_PACKAGE.source, {
        onProgress: (state) => progressStates.push(state),
      });

      if (shouldHaveUpgradePath) {
        expect(upgradeResult.success).toBe(true);
      } else {
        expect(upgradeResult.success || isNoUpgradeMessage(upgradeResult.message)).toBe(true);
      }

      const installed = await listInstalledPackages();
      const jq = installed.find((p) => p.id === TEST_PACKAGE.id);
      expect(jq).toBeDefined();
      expect(sameWingetVersion(jq!.version, latestVersion)).toBe(true);
    }, 180_000);
  });

  // ==========================================================================
  // SECTION 5: Pin/Unpin Behavior
  // ==========================================================================

  describe("Pin/Unpin Behavior", () => {
    beforeAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
      await ensurePackageInstalled(TEST_PACKAGE.id);
    }, 180_000);

    afterAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 120_000);

    it("pinPackage adds package to pin list", async () => {
      let pinned = await listPinnedPackages();
      expect(pinned.find((p) => p.id === TEST_PACKAGE.id)).toBeUndefined();

      const result = await pinPackage(TEST_PACKAGE.id, TEST_PACKAGE.source);
      expect(result.success).toBe(true);

      pinned = await listPinnedPackages();
      expect(pinned.find((p) => p.id === TEST_PACKAGE.id)).toBeDefined();
    }, 120_000);

    it("unpinPackage removes package from pin list", async () => {
      let pinned = await listPinnedPackages();
      expect(pinned.find((p) => p.id === TEST_PACKAGE.id)).toBeDefined();

      const result = await unpinPackage(TEST_PACKAGE.id, TEST_PACKAGE.source);
      expect(result.success).toBe(true);

      pinned = await listPinnedPackages();
      expect(pinned.find((p) => p.id === TEST_PACKAGE.id)).toBeUndefined();
    }, 120_000);
  });

  // ==========================================================================
  // SECTION 5.5: Progress State Propagation (VLC)
  // ==========================================================================

  describe("Progress State Propagation (VLC)", () => {
    beforeAll(async () => {
      await ensurePackageRemoved(PROGRESS_PACKAGE.id);
    }, 180_000);

    afterAll(async () => {
      await ensurePackageRemoved(PROGRESS_PACKAGE.id);
    }, 180_000);

    it("propagates download/verify/install/uninstall states across lifecycle", async () => {
      const versionList = await showPackageVersions(PROGRESS_PACKAGE.id, PROGRESS_PACKAGE.source);
      expect(versionList).not.toBeNull();
      expect(versionList!.versions.length).toBeGreaterThan(1);

      const latestVersion = versionList!.versions[0]!;
      const olderVersion = versionList!.versions[1]!;

      const installStates: WingetProgressState[] = [];
      const upgradeStates: WingetProgressState[] = [];
      const uninstallStates: WingetProgressState[] = [];

      try {
        const installResult = await installPackageVersion(PROGRESS_PACKAGE.id, olderVersion, PROGRESS_PACKAGE.source, {
          onProgress: (state) => installStates.push(state),
        });
        expect(installResult.success).toBe(true);

        expect(hasState(installStates, "downloading")).toBe(true);
        expect(hasState(installStates, "verifying")).toBe(true);
        expect(hasState(installStates, "installing")).toBe(true);
        expect(firstIndexOfState(installStates, "verifying")).toBeGreaterThan(
          firstIndexOfState(installStates, "downloading"),
        );
        expect(firstIndexOfState(installStates, "installing")).toBeGreaterThan(
          firstIndexOfState(installStates, "verifying"),
        );

        await unpinPackage(PROGRESS_PACKAGE.id, PROGRESS_PACKAGE.source);
        await sleep(1000);

        const upgradeResult = await upgradePackage(PROGRESS_PACKAGE.id, PROGRESS_PACKAGE.source, {
          onProgress: (state) => upgradeStates.push(state),
        });
        expect(upgradeResult.success).toBe(true);
        expect(hasState(upgradeStates, "downloading") || hasState(upgradeStates, "installing")).toBe(true);

        const installed = await listInstalledPackages();
        const vlc = installed.find((p) => p.id === PROGRESS_PACKAGE.id);
        expect(vlc).toBeDefined();
        expect(sameWingetVersion(vlc!.version, latestVersion)).toBe(true);

        const uninstallResult = await uninstallPackage(PROGRESS_PACKAGE.id, PROGRESS_PACKAGE.source, {
          onProgress: (state) => uninstallStates.push(state),
        });
        expect(uninstallResult.success).toBe(true);
        expect(hasState(uninstallStates, "uninstalling")).toBe(true);
      } finally {
        await ensurePackageRemoved(PROGRESS_PACKAGE.id);
      }
    }, 240_000);
  });

  // ==========================================================================
  // SECTION 6: Repair Package
  // ==========================================================================

  describe("Repair Package", () => {
    beforeAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
      await ensurePackageInstalled(TEST_PACKAGE.id);
    }, 180_000);

    afterAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 120_000);

    it("repairPackage handles repair-not-supported gracefully", async () => {
      const result = await repairPackage(TEST_PACKAGE.id, TEST_PACKAGE.source);
      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
      expect(result.message!.toLowerCase()).toMatch(/not supported|repair|not found/i);
    }, 180_000);
  });

  // ==========================================================================
  // SECTION 7: Download Installer
  // ==========================================================================

  describe("Download Installer", () => {
    it("downloadInstaller downloads VLC installer without installing", async () => {
      const progressStates: WingetProgressState[] = [];
      const result = await downloadInstaller(PROGRESS_PACKAGE.id, PROGRESS_PACKAGE.source, {
        onProgress: (state) => progressStates.push(state),
      });

      expect(result.success).toBe(true);
      expect(result.downloadPath).toBeDefined();
      expect(result.downloadPath).toContain(PROGRESS_PACKAGE.id);

      expect(progressStates.map((s) => s.type)).toContain("downloading");

      const downloadingStates = progressStates.filter(
        (s): s is Extract<WingetProgressState, { type: "downloading" }> => s.type === "downloading",
      );
      expect(downloadingStates.length).toBeGreaterThan(0);
      const last = downloadingStates.find((s) => s.total > 0) ?? downloadingStates.at(-1)!;
      expect(last.current).toBeGreaterThanOrEqual(0);
      expect(["MB", "GB"]).toContain(last.unit);
    }, 120_000);
  });

  // ==========================================================================
  // SECTION 8: Export Packages
  // ==========================================================================

  describe("Export Packages", () => {
    const exportPath = join(tmpdir(), `winget-test-export-${Date.now()}.json`);
    const exportWithVersionsPath = join(tmpdir(), `winget-test-export-versions-${Date.now()}.json`);

    beforeAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
      await ensurePackageInstalled(TEST_PACKAGE.id);
    }, 180_000);

    afterAll(async () => {
      await safeUnlink(exportPath);
      await safeUnlink(exportWithVersionsPath);
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 120_000);

    it("exportPackages creates valid JSON manifest", async () => {
      const result = await exportPackages(exportPath, false);
      expect(result.success).toBe(true);
      expect(await fileExists(exportPath)).toBe(true);

      const json = JSON.parse(await readFile(exportPath, "utf-8"));
      expect(json).toHaveProperty("$schema");
      expect(json).toHaveProperty("Sources");
      expect(Array.isArray(json.Sources)).toBe(true);
      expect(json.Sources.length).toBeGreaterThan(0);

      let foundJq = false;
      for (const source of json.Sources) {
        for (const pkg of source.Packages || []) {
          expect(pkg).toHaveProperty("PackageIdentifier");
          if (pkg.PackageIdentifier === TEST_PACKAGE.id) foundJq = true;
        }
      }
      expect(foundJq).toBe(true);
    }, 120_000);

    it("exportPackages with includeVersions adds version to packages", async () => {
      const result = await exportPackages(exportWithVersionsPath, true);
      expect(result.success).toBe(true);

      const json = JSON.parse(await readFile(exportWithVersionsPath, "utf-8"));
      const allPackages = (json.Sources || []).flatMap(
        (source: { Packages?: Array<Record<string, unknown>> }) => source.Packages || [],
      );

      const withVersion = allPackages.filter(
        (pkg: Record<string, unknown>) => typeof pkg.Version === "string" && (pkg.Version as string).trim().length > 0,
      );
      expect(withVersion.length).toBeGreaterThan(0);
    }, 120_000);
  });

  // ==========================================================================
  // SECTION 9: Import Packages
  // ==========================================================================

  describe("Import Packages", () => {
    const importPath = join(tmpdir(), `winget-test-import-${Date.now()}.json`);

    beforeAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 180_000);

    afterAll(async () => {
      await safeUnlink(importPath);
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 180_000);

    it("importPackages fails gracefully for non-existent file", async () => {
      const result = await importPackages("/non/existent/file.json");
      expect(result.success).toBe(false);
    }, 120_000);

    it("importPackages installs packages from manifest", async () => {
      let installed = await listInstalledPackages();
      expect(installed.find((p) => p.id === TEST_PACKAGE.id)).toBeUndefined();

      const manifest = {
        $schema: "https://aka.ms/winget-packages.schema.2.0.json",
        CreationDate: new Date().toISOString(),
        Sources: [
          {
            Packages: [{ PackageIdentifier: TEST_PACKAGE.id }],
            SourceDetails: {
              Argument: "https://cdn.winget.microsoft.com/cache",
              Identifier: "Microsoft.Winget.Source_8wekyb3d8bbwe",
              Name: "winget",
              Type: "Microsoft.PreIndexed.Package",
            },
          },
        ],
        WinGetVersion: "1.6.0",
      };

      await writeFile(importPath, JSON.stringify(manifest, null, 2));

      const result = await importPackages(importPath);
      expect(result.success).toBe(true);

      installed = await listInstalledPackages();
      expect(installed.find((p) => p.id === TEST_PACKAGE.id)).toBeDefined();
    }, 180_000);

    it("importPackages respects noUpgrade option", async () => {
      // Self-contained: do not rely on the previous test's install or its
      // manifest file (winget's list output can also briefly flap right after
      // an import while it re-correlates ARP entries).
      await ensurePackageInstalled(TEST_PACKAGE.id);
      const manifest = {
        $schema: "https://aka.ms/winget-packages.schema.2.0.json",
        CreationDate: new Date().toISOString(),
        Sources: [
          {
            Packages: [{ PackageIdentifier: TEST_PACKAGE.id }],
            SourceDetails: {
              Argument: "https://cdn.winget.microsoft.com/cache",
              Identifier: "Microsoft.Winget.Source_8wekyb3d8bbwe",
              Name: "winget",
              Type: "Microsoft.PreIndexed.Package",
            },
          },
        ],
        WinGetVersion: "1.6.0",
      };
      await writeFile(importPath, JSON.stringify(manifest, null, 2));

      const before = await listInstalledPackages();
      const jqBefore = before.find((p) => p.id === TEST_PACKAGE.id);
      expect(jqBefore).toBeDefined();

      const result = await importPackages(importPath, { noUpgrade: true });
      expect(result.success).toBe(true);

      const after = await listInstalledPackages();
      const jqAfter = after.find((p) => p.id === TEST_PACKAGE.id);
      expect(jqAfter!.version).toBe(jqBefore!.version);
    }, 120_000);

    it("importPackages respects ignoreUnavailable option", async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);

      const manifest = {
        $schema: "https://aka.ms/winget-packages.schema.2.0.json",
        CreationDate: new Date().toISOString(),
        Sources: [
          {
            Packages: [{ PackageIdentifier: TEST_PACKAGE.id }, { PackageIdentifier: "NonExistent.FakePackage.12345" }],
            SourceDetails: {
              Argument: "https://cdn.winget.microsoft.com/cache",
              Identifier: "Microsoft.Winget.Source_8wekyb3d8bbwe",
              Name: "winget",
              Type: "Microsoft.PreIndexed.Package",
            },
          },
        ],
        WinGetVersion: "1.6.0",
      };

      const invalidPath = join(tmpdir(), `winget-test-import-invalid-${Date.now()}.json`);
      await writeFile(invalidPath, JSON.stringify(manifest, null, 2));

      try {
        await importPackages(invalidPath, { ignoreUnavailable: true });
        const installed = await listInstalledPackages();
        expect(installed.find((p) => p.id === TEST_PACKAGE.id)).toBeDefined();
      } finally {
        await safeUnlink(invalidPath);
      }
    }, 180_000);

    it("importPackages respects ignoreVersions option", async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);

      const versionList = await showPackageVersions(TEST_PACKAGE.id, TEST_PACKAGE.source);
      expect(versionList).not.toBeNull();
      const latestVersion = versionList!.versions[0]!;
      const olderVersion = versionList!.versions[1]!;

      const manifest = {
        $schema: "https://aka.ms/winget-packages.schema.2.0.json",
        CreationDate: new Date().toISOString(),
        Sources: [
          {
            Packages: [{ PackageIdentifier: TEST_PACKAGE.id, Version: olderVersion }],
            SourceDetails: {
              Argument: "https://cdn.winget.microsoft.com/cache",
              Identifier: "Microsoft.Winget.Source_8wekyb3d8bbwe",
              Name: "winget",
              Type: "Microsoft.PreIndexed.Package",
            },
          },
        ],
        WinGetVersion: "1.6.0",
      };

      const versionPath = join(tmpdir(), `winget-test-import-versions-${Date.now()}.json`);
      await writeFile(versionPath, JSON.stringify(manifest, null, 2));

      try {
        const result = await importPackages(versionPath, {
          ignoreVersions: true,
        });
        expect(result.success).toBe(true);

        const installed = await listInstalledPackages();
        const jq = installed.find((p) => p.id === TEST_PACKAGE.id);
        expect(jq).toBeDefined();
        expect(sameWingetVersion(jq!.version, latestVersion)).toBe(true);
      } finally {
        await safeUnlink(versionPath);
      }
    }, 180_000);
  });

  // ==========================================================================
  // SECTION 10: Cancellation
  // ==========================================================================

  describe("Cancellation", () => {
    beforeAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 180_000);

    afterAll(async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
    }, 180_000);

    it("abort signal cancels running install operation", async () => {
      const controller = new AbortController();

      const installPromise = installPackage(TEST_PACKAGE.id, TEST_PACKAGE.source, {
        signal: controller.signal,
      });

      setTimeout(() => controller.abort(), 100);

      const result = await installPromise;

      // Either cancelled or completed before cancel took effect — both valid
      if (!result.success) {
        expect(result.message).toContain("cancelled");
      }
    }, 180_000);
  });

  // ==========================================================================
  // SECTION 11: Error Handling
  // ==========================================================================

  describe("Error Handling", () => {
    it("uninstallPackage returns failure for non-installed package", async () => {
      await ensurePackageRemoved(TEST_PACKAGE.id);
      const result = await uninstallPackage(TEST_PACKAGE.id, TEST_PACKAGE.source);
      expect(result.success).toBe(false);
    }, 120_000);

    it("upgradePackage handles no-upgrade-available gracefully", async () => {
      await ensurePackageInstalled(TEST_PACKAGE.id);

      const upgrades = await listUpgradePackages();
      const jqUpgrade = upgrades.find((p) => p.id === TEST_PACKAGE.id);

      if (!jqUpgrade) {
        const result = await upgradePackage(TEST_PACKAGE.id, TEST_PACKAGE.source);
        expect(result.success).toBe(true);
      }

      await ensurePackageRemoved(TEST_PACKAGE.id);
      // Install + upgrade-check + noop-upgrade + uninstall: winget can spend
      // 60s+ re-indexing sources right after an install, so budget generously.
    }, 180_000);
  });
});
