import { useEffect, useState } from "react";
import fs from "node:fs";
import { Action, ActionPanel, Clipboard, Detail, Icon, Toast, environment, useNavigation } from "@raycast/api";
import { execa } from "execa";
import { getHomebrewPath, getSpotdlPath, getWingetPath, isMac, isWindows } from "../utils.js";
import { downloadSpotdl, getInstalledVersion, getLatestRelease } from "../lib/managed-binary.js";
import { friendlyNameFor, HOMEBREW_FORMULAE, WINGET_PACKAGES } from "../lib/tools.js";
import { resetWingetPackagesCache } from "../lib/binary.js";

type PackageIssue = { pkg: string; message: string };
type CheckResult = { versions: Record<string, string>; outdated: Record<string, string>; checkIssues: PackageIssue[] };

export default function Updater() {
  const { pop } = useNavigation();
  const emptyVersions = (): Record<string, string> =>
    Object.fromEntries([...(isMac ? HOMEBREW_FORMULAE : WINGET_PACKAGES), "spotdl"].map((name) => [name, ""]));
  const [versions, setVersions] = useState<Record<string, string>>(emptyVersions);
  const [outdated, setOutdated] = useState<Record<string, string>>(emptyVersions);
  const [checkIssues, setCheckIssues] = useState<PackageIssue[]>([]);
  const [upgradeIssues, setUpgradeIssues] = useState<PackageIssue[]>([]);
  const [upgradingMessage, setUpgradingMessage] = useState<string>("");

  const allUpToDate = Object.values(outdated).every((version) => !version);

  useEffect(() => {
    if (upgradingMessage) return;
    const toast = new Toast({ style: Toast.Style.Animated, title: "Checking versions..." });
    toast.show();

    check()
      .then(({ versions, outdated, checkIssues }) => {
        toast.hide();
        setVersions(versions);
        setOutdated(outdated);
        setCheckIssues(checkIssues);
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to check versions";
        toast.message = errorMessage;
        if (error instanceof Error) {
          toast.primaryAction = {
            title: "Copy to Clipboard",
            onAction: () => {
              Clipboard.copy(errorMessage);
            },
          };
        }
      });
  }, [upgradingMessage]);

  const versionRows = Object.entries(versions)
    .map(([cli, version]) => {
      const checkIssue = checkIssues.find((i) => i.pkg === cli);
      let status: string;
      if (checkIssue) status = `(check failed: ${truncate(checkIssue.message, 80)})`;
      else if (version === "not installed") status = "";
      else if (outdated[cli]) status = `(outdated: ${outdated[cli]})`;
      else status = "(up to date)";
      const versionText = version === "" && !checkIssue ? "Checking..." : version || "—";
      return `${friendlyNameFor(cli)}: ${versionText}${status ? ` ${status}` : ""}`;
    })
    .join("\n\n");

  // Check issues keyed to a package-manager itself (brew/winget) — not a single
  // formula — don't map onto any version row, so render them on their own.
  // Otherwise a failed `brew info` would leave every row stuck at "Checking..."
  // with no visible reason.
  const orphanCheckIssues = checkIssues.filter((i) => !(i.pkg in versions));
  const checkSection =
    orphanCheckIssues.length > 0
      ? `\n\n## Check Issues\n\n${orphanCheckIssues
          .map((i) => `- **${friendlyNameFor(i.pkg)}**: ${i.message}`)
          .join("\n")}`
      : "";

  const upgradeSection =
    upgradeIssues.length > 0
      ? `\n\n## Upgrade Issues\n\n${upgradeIssues.map((i) => `- **${friendlyNameFor(i.pkg)}**: ${i.message}`).join("\n")}`
      : "";

  return (
    <Detail
      markdown={
        ["## Versions", versionRows, upgradingMessage].filter((x) => Boolean(x)).join("\n\n") +
        checkSection +
        upgradeSection
      }
      actions={
        <ActionPanel>
          {allUpToDate ? undefined : (
            <Action
              icon={Icon.Download}
              title="Upgrade"
              onAction={async () => {
                const toast = new Toast({ style: Toast.Style.Animated, title: "Upgrading..." });
                toast.show();
                try {
                  setUpgradingMessage("Upgrading... Please do not close Raycast while the upgrade is in progress.");
                  const { issues } = await upgrade();
                  setUpgradeIssues(issues);
                  toast.style =
                    issues.length === 0
                      ? Toast.Style.Success
                      : issues.length === [...HOMEBREW_FORMULAE, ...WINGET_PACKAGES, "spotdl"].length
                        ? Toast.Style.Failure
                        : Toast.Style.Success;
                  toast.title =
                    issues.length === 0 ? "Upgrade complete" : `Upgrade finished with ${issues.length} issue(s)`;
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to upgrade";
                  toast.message = error instanceof Error ? error.message : "An unknown error occurred";
                  if (error instanceof Error) {
                    toast.primaryAction = {
                      title: "Copy to Clipboard",
                      onAction: () => {
                        Clipboard.copy(error.message);
                      },
                    };
                  }
                } finally {
                  setUpgradingMessage("");
                }
              }}
            />
          )}
          {upgradeIssues.length > 0 && (
            <Action
              icon={Icon.Clipboard}
              title="Copy Upgrade Issues"
              onAction={() =>
                Clipboard.copy(upgradeIssues.map((i) => `${friendlyNameFor(i.pkg)}: ${i.message}`).join("\n"))
              }
            />
          )}
          <Action icon={Icon.ArrowLeft} title="Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
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

async function check(): Promise<CheckResult> {
  const [{ versions, issues: versionIssues }, { outdated, issues: outdatedIssues }] = await Promise.all([
    getVersions(),
    getOutdated(),
  ]);
  return { versions, outdated, checkIssues: [...versionIssues, ...outdatedIssues] };
}

async function getSpotdlVersion(): Promise<string> {
  const spotdlPath = getSpotdlPath();
  if (!fs.existsSync(spotdlPath)) return "not installed";
  try {
    return await getInstalledVersion(spotdlPath);
  } catch {
    return "unknown";
  }
}

async function getVersions(): Promise<{ versions: Record<string, string>; issues: PackageIssue[] }> {
  const versions: Record<string, string> = {};
  const issues: PackageIssue[] = [];
  if (isMac) {
    try {
      const { stdout: infoOutput } = await execa(getHomebrewPath(), ["info", "--json=v2", ...HOMEBREW_FORMULAE]);
      const info = JSON.parse(infoOutput) as { formulae: { name: string; versions: { stable: string } }[] };
      for (const { name, versions: formulaVersions } of info.formulae) {
        versions[name] = formulaVersions.stable;
      }
    } catch (error) {
      // `brew info` failed for the whole batch — record it once against brew,
      // rather than silently leaving every row blank.
      for (const f of HOMEBREW_FORMULAE) versions[f] = "";
      issues.push({ pkg: "brew", message: errorMessageOf(error) });
    }
  } else if (isWindows) {
    try {
      const wingetPath = await getWingetPath();
      for (const pkg of WINGET_PACKAGES) {
        try {
          const { stdout } = await execa(wingetPath, ["list", "--id", pkg, "--exact"]);
          versions[pkg] = parseWingetVersion(stdout, pkg);
        } catch (error) {
          versions[pkg] = "";
          issues.push({ pkg, message: errorMessageOf(error) });
        }
      }
    } catch (error) {
      for (const pkg of WINGET_PACKAGES) versions[pkg] = "";
      issues.push({ pkg: "winget", message: errorMessageOf(error) });
    }
  }
  versions["spotdl"] = await getSpotdlVersion();
  return { versions, issues };
}

function parseWingetVersion(output: string, packageId: string): string {
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.includes(packageId)) {
      const versionMatch = line.match(/(\d+\.)+\d+/);
      if (versionMatch) {
        return versionMatch[0];
      }
    }
  }
  return "";
}

async function getOutdated(): Promise<{ outdated: Record<string, string>; issues: PackageIssue[] }> {
  const outdated: Record<string, string> = {};
  const issues: PackageIssue[] = [];
  if (isMac) {
    try {
      const { stdout: outdatedOutput } = await execa(getHomebrewPath(), [
        "outdated",
        "--json=v2",
        ...HOMEBREW_FORMULAE,
      ]);
      const info = JSON.parse(outdatedOutput) as { formulae: { name: string; current_version: string }[] };
      for (const { name, current_version } of info.formulae) {
        outdated[name] = current_version;
      }
    } catch (error) {
      issues.push({ pkg: "brew", message: errorMessageOf(error) });
    }
  } else if (isWindows) {
    try {
      const wingetPath = await getWingetPath();
      const { stdout: upgradeOutput } = await execa(wingetPath, ["upgrade"]);
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

async function upgrade(): Promise<{ issues: PackageIssue[] }> {
  const issues: PackageIssue[] = [];
  if (isMac) {
    const brew = getHomebrewPath();
    for (const formula of HOMEBREW_FORMULAE) {
      try {
        await execa(brew, ["upgrade", formula]);
      } catch (error) {
        issues.push({ pkg: formula, message: errorMessageOf(error) });
      }
    }
  } else if (isWindows) {
    const wingetPath = await getWingetPath();
    for (const pkg of WINGET_PACKAGES) {
      try {
        await execa(wingetPath, ["upgrade", "--id", pkg, "--accept-source-agreements", "--accept-package-agreements"]);
      } catch (error) {
        // winget exits non-zero when a package has no available upgrade —
        // that's the common case, not a real failure. Distinguish from
        // genuine failure by inspecting the exit code if available; otherwise
        // surface it but keep going.
        const exitCode = (error as { exitCode?: number }).exitCode;
        if (exitCode !== undefined && exitCode !== 0 && exitCode !== -1978335212) {
          issues.push({ pkg, message: errorMessageOf(error) });
        }
      }
    }
    resetWingetPackagesCache();
  }
  try {
    const spotdlPath = getSpotdlPath();
    if (fs.existsSync(spotdlPath)) {
      const installed = extractSemver(await getInstalledVersion(spotdlPath));
      const latest = extractSemver((await getLatestRelease()).version);
      if (installed && latest && installed !== latest) {
        await downloadSpotdl(environment.supportPath);
      }
    }
  } catch (error) {
    issues.push({ pkg: "spotdl", message: errorMessageOf(error) });
  }
  return { issues };
}

export async function checkUpToDate() {
  const { outdated } = await getOutdated();
  const allUpToDate = Object.values(outdated).every((version) => !version);
  return allUpToDate;
}
