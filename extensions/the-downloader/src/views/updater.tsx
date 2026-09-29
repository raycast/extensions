import { useEffect, useState } from "react";
import fs from "node:fs";
import { Action, ActionPanel, Clipboard, Color, Icon, Image, Keyboard, List, Toast, showToast } from "@raycast/api";
import { execa } from "execa";
import { getHomebrewPath, getSpotdlPath, getWingetPath, isMac, isWindows } from "../utils.js";
import { getInstalledVersion } from "../lib/managed-binary.js";
import { friendlyNameFor, HOMEBREW_FORMULAE, toolInfoFor, WINGET_PACKAGES } from "../lib/tools.js";
import { checkOutdated, errorMessageOf, upgrade } from "../lib/package-manager.js";
import { clearToolCheckCache } from "../lib/tool-updates.js";
import { PackageIssue, ToolStatus, toolStatus, versionReport } from "../lib/tool-status.js";

type CheckResult = { versions: Record<string, string>; outdated: Record<string, string>; checkIssues: PackageIssue[] };

const packages = (): string[] => [...(isMac ? HOMEBREW_FORMULAE : WINGET_PACKAGES), "spotdl"];

function statusIcon(status: ToolStatus, upgrading: boolean): Image.ImageLike {
  if (upgrading) return { source: Icon.CircleProgress, tintColor: Color.Blue };
  switch (status.kind) {
    case "checking":
      return { source: Icon.CircleProgress, tintColor: Color.SecondaryText };
    case "missing":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    case "current":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "outdated":
      return { source: Icon.ArrowUpCircle, tintColor: Color.Yellow };
    case "check-failed":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "upgrade-failed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
}

function statusAccessories(status: ToolStatus, upgrading: boolean): List.Item.Accessory[] {
  if (upgrading) return [{ tag: { value: "Upgrading…", color: Color.Blue } }];
  switch (status.kind) {
    case "checking":
      return [{ text: "Checking…" }];
    case "missing":
      return [{ tag: { value: "Not Installed", color: Color.SecondaryText } }];
    case "current":
      return [{ text: status.version }, { tag: { value: "Up to Date", color: Color.Green } }];
    case "outdated":
      return [{ text: status.version }, { tag: { value: `Update → ${status.latest}`, color: Color.Yellow } }];
    case "check-failed":
      return [
        ...(status.version ? [{ text: status.version }] : []),
        { tag: { value: "Check Failed", color: Color.Orange }, tooltip: status.message },
      ];
    case "upgrade-failed":
      return [
        ...(status.version ? [{ text: status.version }] : []),
        { tag: { value: "Upgrade Failed", color: Color.Red }, tooltip: status.message },
      ];
  }
}

export default function Updater() {
  const [result, setResult] = useState<CheckResult>();
  const [checking, setChecking] = useState(true);
  const [upgrading, setUpgrading] = useState<string[]>([]);
  const [upgradeIssues, setUpgradeIssues] = useState<PackageIssue[]>([]);
  const [checkRun, setCheckRun] = useState(0);

  useEffect(() => {
    let active = true;
    setChecking(true);
    check()
      .then((next) => {
        if (active) setResult(next);
      })
      .catch(async (error) => {
        const message = errorMessageOf(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to check versions",
          message,
          primaryAction: { title: "Copy Error", onAction: () => Clipboard.copy(message) },
        });
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [checkRun]);

  const versions = result?.versions ?? Object.fromEntries(packages().map((p) => [p, ""]));
  const outdated = result?.outdated ?? {};
  const checkIssues = result?.checkIssues ?? [];
  const rows = Object.keys(versions).map((pkg) => ({
    pkg,
    name: toolInfoFor(pkg).name,
    status:
      checking && !result
        ? ({ kind: "checking" } as ToolStatus)
        : toolStatus(pkg, versions, outdated, checkIssues, upgradeIssues),
  }));
  const outdatedPkgs = rows.filter((r) => r.status.kind === "outdated").map((r) => r.pkg);
  // Issues against brew/winget itself don't belong to one tool row.
  const managerIssues = checkIssues.filter((i) => !(i.pkg in versions));
  const busy = checking || upgrading.length > 0;

  async function runUpgrade(pkgs: string[]) {
    if (upgrading.length > 0 || pkgs.length === 0) return;
    setUpgrading(pkgs);
    const label = pkgs.length === 1 ? toolInfoFor(pkgs[0]).name : `${pkgs.length} tools`;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Upgrading ${label}…`,
      message: "Keep Raycast open until it finishes.",
    });
    try {
      // Upgrade only what the check found outdated — see `upgrade`.
      const { issues, attempted } = await upgrade(Object.fromEntries(pkgs.map((p) => [p, outdated[p]])));
      setUpgradeIssues((prev) => [...prev.filter((i) => !pkgs.includes(i.pkg)), ...issues]);
      toast.style = issues.length > 0 && issues.length >= attempted ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = issues.length === 0 ? `Upgraded ${label}` : `Upgrade finished with ${issues.length} issue(s)`;
      toast.message =
        issues.length > 0 ? issues.map((i) => `${toolInfoFor(i.pkg).name}: ${i.message}`).join("\n") : undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to upgrade";
      toast.message = errorMessageOf(error);
      toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(errorMessageOf(error)) };
    } finally {
      // The download prompt's cached check is stale now.
      await clearToolCheckCache();
      setUpgrading([]);
      setCheckRun((n) => n + 1);
    }
  }

  const checkAgain = (
    <Action
      title="Check Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => setCheckRun((n) => n + 1)}
    />
  );
  const upgradeAll =
    outdatedPkgs.length > 1 ? (
      <Action
        title={`Upgrade All (${outdatedPkgs.length})`}
        icon={Icon.Download}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "u" },
          Windows: { modifiers: ["ctrl", "shift"], key: "u" },
        }}
        onAction={() => runUpgrade(outdatedPkgs)}
      />
    ) : null;
  const copyReport = (
    <Action.CopyToClipboard
      title="Copy Version Info"
      content={versionReport(rows)}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );

  const sections: { title: string; filter: (s: ToolStatus) => boolean }[] = [
    { title: "Updates Available", filter: (s) => s.kind === "outdated" || s.kind === "upgrade-failed" },
    { title: "Installed", filter: (s) => s.kind === "current" || s.kind === "check-failed" || s.kind === "checking" },
    { title: "Not Installed", filter: (s) => s.kind === "missing" },
  ];

  return (
    <List isLoading={busy} navigationTitle="Update Libraries" searchBarPlaceholder="Search tools">
      {managerIssues.length > 0 && (
        <List.Section title="Problems">
          {managerIssues.map((issue) => (
            <List.Item
              key={issue.pkg}
              title={issue.pkg === "brew" ? "Homebrew" : issue.pkg === "winget" ? "winget" : friendlyNameFor(issue.pkg)}
              subtitle={issue.message}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Error" content={issue.message} />
                  {checkAgain}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {sections.map((section) => {
        const sectionRows = rows.filter((r) => section.filter(r.status));
        if (sectionRows.length === 0) return null;
        return (
          <List.Section key={section.title} title={section.title} subtitle={String(sectionRows.length)}>
            {sectionRows.map(({ pkg, name, status }) => {
              const info = toolInfoFor(pkg);
              const isUpgrading = upgrading.includes(pkg);
              const issue =
                status.kind === "check-failed" || status.kind === "upgrade-failed" ? status.message : undefined;
              return (
                <List.Item
                  key={pkg}
                  title={name}
                  subtitle={info.purpose}
                  icon={statusIcon(status, isUpgrading)}
                  accessories={statusAccessories(status, isUpgrading)}
                  actions={
                    <ActionPanel>
                      {(status.kind === "outdated" || status.kind === "upgrade-failed") && outdated[pkg] && (
                        <Action title={`Upgrade ${name}`} icon={Icon.Download} onAction={() => runUpgrade([pkg])} />
                      )}
                      {upgradeAll}
                      {checkAgain}
                      {issue && <Action.CopyToClipboard title="Copy Error" content={issue} />}
                      {copyReport}
                      {info.homepage && (
                        <Action.OpenInBrowser
                          title={`Open ${name} Website`}
                          url={info.homepage}
                          shortcut={Keyboard.Shortcut.Common.Open}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

async function check(): Promise<CheckResult> {
  const [{ versions, issues: versionIssues }, { outdated, issues: outdatedIssues }] = await Promise.all([
    getVersions(),
    checkOutdated(),
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
      // Report the INSTALLED version (`installed`, newest keg last) — NOT
      // `versions.stable`, which is the latest version in the formula
      // definition. The old code displayed `stable`, so a tool that was never
      // brew-installed still showed a version with "(up to date)" next to it.
      const info = JSON.parse(infoOutput) as { formulae: { name: string; installed: { version: string }[] }[] };
      for (const { name, installed } of info.formulae) {
        versions[name] = installed.at(-1)?.version ?? "not installed";
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
