/** Where a tool stands in the Updater, derived from the version check and any upgrade attempt. */
export type ToolStatus =
  | { kind: "checking" }
  | { kind: "missing" }
  | { kind: "current"; version: string }
  | { kind: "outdated"; version: string; latest: string }
  | { kind: "check-failed"; version: string; message: string }
  | { kind: "upgrade-failed"; version: string; message: string };

export type PackageIssue = { pkg: string; message: string };

export function toolStatus(
  pkg: string,
  versions: Record<string, string>,
  outdated: Record<string, string>,
  checkIssues: PackageIssue[],
  upgradeIssues: PackageIssue[],
): ToolStatus {
  const version = versions[pkg] ?? "";
  const upgradeIssue = upgradeIssues.find((i) => i.pkg === pkg);
  if (upgradeIssue) return { kind: "upgrade-failed", version, message: upgradeIssue.message };
  const checkIssue = checkIssues.find((i) => i.pkg === pkg);
  if (checkIssue) return { kind: "check-failed", version, message: checkIssue.message };
  if (version === "") return { kind: "checking" };
  if (version === "not installed") return { kind: "missing" };
  if (outdated[pkg]) return { kind: "outdated", version, latest: outdated[pkg] };
  return { kind: "current", version };
}

/**
 * A version short enough for the Updater's row: winget's FFmpeg for yt-dlp is a
 * nightly build versioned `N-127043-g5a54fcf75e-20260930`, shown as its build
 * date `2026.09.30` (yt-dlp's own style) so the status tag beside it still fits.
 */
export function displayVersion(version: string): string {
  const nightly = /^N-\d+-g[0-9a-f]+-(\d{4})(\d{2})(\d{2})$/.exec(version);
  return nightly ? `${nightly[1]}.${nightly[2]}.${nightly[3]}` : version;
}

/** Plain-text summary of every tool, for "Copy Version Info". */
export function versionReport(rows: { name: string; status: ToolStatus }[]): string {
  return rows
    .map(({ name, status }) => {
      switch (status.kind) {
        case "checking":
          return `${name}: checking…`;
        case "missing":
          return `${name}: not installed`;
        case "current":
          return `${name}: ${status.version} (up to date)`;
        case "outdated":
          return `${name}: ${status.version} (update available: ${status.latest})`;
        case "check-failed":
          return `${name}: ${status.version || "unknown"} (check failed: ${status.message})`;
        case "upgrade-failed":
          return `${name}: ${status.version || "unknown"} (upgrade failed: ${status.message})`;
      }
    })
    .join("\n");
}
