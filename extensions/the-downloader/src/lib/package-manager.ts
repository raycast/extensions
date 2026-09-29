import fs from "node:fs";
import { environment } from "@raycast/api";
import { execa } from "execa";
import { getHomebrewPath, getSpotdlPath, getWingetPath, isMac, isWindows } from "../utils.js";
import { downloadSpotdl, getInstalledVersion, getLatestRelease } from "./managed-binary.js";
import { HOMEBREW_FORMULAE, isWingetUpdateNotApplicable, WINGET_PACKAGES } from "./tools.js";
import { resetWingetPackagesCache } from "./binary.js";
import { PackageIssue } from "./tool-status.js";

/** Caps for package-manager calls, so a wedged brew/winget can't hang a check or an upgrade forever. */
const CHECK_TIMEOUT_MS = 90_000;
const UPGRADE_TIMEOUT_MS = 20 * 60_000;

export function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
}

/**
 * Upgrade the packages the version check found outdated. `outdated` is the
 * check's package → newer-version map; anything without an entry is skipped —
 * upgrading unconditionally made brew/winget error on packages that were never
 * installed through them. Returns the per-package failures plus how many
 * upgrades were attempted, so the caller can tell "all failed" from "some".
 */
export async function upgrade(
  outdated: Record<string, string>,
): Promise<{ issues: PackageIssue[]; attempted: number }> {
  const issues: PackageIssue[] = [];
  let attempted = 0;
  if (isMac) {
    const brew = getHomebrewPath();
    for (const formula of HOMEBREW_FORMULAE) {
      if (!outdated[formula]) continue;
      attempted += 1;
      try {
        await execa(brew, ["upgrade", formula], { timeout: UPGRADE_TIMEOUT_MS });
      } catch (error) {
        issues.push({ pkg: formula, message: errorMessageOf(error) });
      }
    }
  } else if (isWindows) {
    const wingetPath = await getWingetPath();
    for (const pkg of WINGET_PACKAGES) {
      if (!outdated[pkg]) continue;
      attempted += 1;
      try {
        await execa(wingetPath, ["upgrade", "--id", pkg, "--accept-source-agreements", "--accept-package-agreements"], {
          timeout: UPGRADE_TIMEOUT_MS,
        });
      } catch (error) {
        // winget exits non-zero when a package has no available upgrade (it
        // may have been upgraded since the check) — not a real failure.
        const exitCode = (error as { exitCode?: number }).exitCode;
        if (exitCode === 0 || isWingetUpdateNotApplicable(exitCode)) continue;
        issues.push({ pkg, message: errorMessageOf(error) });
      }
    }
    resetWingetPackagesCache();
  }
  if (outdated["spotdl"]) {
    attempted += 1;
    try {
      await downloadSpotdl(environment.supportPath);
    } catch (error) {
      issues.push({ pkg: "spotdl", message: errorMessageOf(error) });
    }
  }
  return { issues, attempted };
}

/**
 * Extract a clean `x.y.z` from a version string, or "" if none is present. Both
 * sides of the spotDL installed-vs-latest comparison go through this so a
 * differently-formatted string (banner text, a pre-release suffix, a 4th
 * component) can't make a current binary look outdated and trigger a spurious
 * ~40 MB re-download. An unparsable installed version yields "" and is left
 * alone rather than treated as outdated.
 */
function extractSemver(version: string): string {
  return version.match(/\d+\.\d+\.\d+/)?.[0] ?? "";
}

/**
 * Every package with a newer version available, as package → newest version:
 * Homebrew formulae (or winget IDs) plus the managed spotDL binary. The
 * Updater lists these; the download prompt checks them before a download.
 */
export async function checkOutdated(): Promise<{ outdated: Record<string, string>; issues: PackageIssue[] }> {
  const outdated: Record<string, string> = {};
  const issues: PackageIssue[] = [];
  if (isMac) {
    try {
      // No explicit formula names: `brew outdated <name>` errors out for a
      // formula that isn't installed (e.g. monolith on a user who never saved
      // a webpage), failing the whole batch. List everything outdated on the
      // system instead and filter to our formulae. `current_version` is the
      // newest version available for the (installed, outdated) formula.
      const { stdout: outdatedOutput } = await execa(getHomebrewPath(), ["outdated", "--json=v2"], {
        timeout: CHECK_TIMEOUT_MS,
      });
      const info = JSON.parse(outdatedOutput) as { formulae: { name: string; current_version: string }[] };
      for (const { name, current_version } of info.formulae) {
        if (HOMEBREW_FORMULAE.includes(name)) outdated[name] = current_version;
      }
    } catch (error) {
      issues.push({ pkg: "brew", message: errorMessageOf(error) });
    }
  } else if (isWindows) {
    try {
      const wingetPath = await getWingetPath();
      const { stdout: upgradeOutput } = await execa(wingetPath, ["upgrade"], { timeout: CHECK_TIMEOUT_MS });
      for (const line of upgradeOutput.split("\n")) {
        for (const pkg of WINGET_PACKAGES) {
          if (line.includes(pkg)) {
            const versionMatch = line.match(/(\d+\.)+\d+/g);
            if (versionMatch && versionMatch.length >= 2) {
              outdated[pkg] = versionMatch[1];
            }
          }
        }
      }
    } catch (error) {
      issues.push({ pkg: "winget", message: errorMessageOf(error) });
    }
  }
  try {
    const spotdlPath = getSpotdlPath();
    if (fs.existsSync(spotdlPath)) {
      const installed = extractSemver(await getInstalledVersion(spotdlPath));
      const latest = extractSemver((await getLatestRelease()).version);
      if (installed && latest && installed !== latest) {
        outdated["spotdl"] = latest;
      }
    }
  } catch (error) {
    issues.push({ pkg: "spotdl", message: errorMessageOf(error) });
  }
  return { outdated, issues };
}
