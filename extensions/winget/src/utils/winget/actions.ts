import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { execWinget, execWingetWithCode } from "./commands";
export function runInBackground(): boolean {
  return getPreferenceValues<Preferences>().runInBackground;
}

// --accept-package-agreements is only valid for install/upgrade, not uninstall
const INSTALL_FLAGS = [
  "--silent",
  "--accept-package-agreements",
  "--accept-source-agreements",
  "--disable-interactivity",
];

const UNINSTALL_FLAGS = ["--silent", "--accept-source-agreements", "--disable-interactivity"];

export async function wingetInstall(id: string): Promise<void> {
  if (runInBackground()) {
    await showHUD(`Installing ${id}…`);
    try {
      await execWinget(["install", "--id", id, "--exact", ...INSTALL_FLAGS]);
      await showHUD(`✅ Installed ${id}`);
    } catch {
      await showHUD(`❌ Install failed: ${id}`);
    }
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Installing…", message: id });
  try {
    await execWinget(["install", "--id", id, "--exact", ...INSTALL_FLAGS]);
    toast.style = Toast.Style.Success;
    toast.title = "Installed";
    toast.message = id;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Install failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export async function wingetUninstall(id: string): Promise<boolean> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Uninstalling…",
    message: id,
  });
  try {
    await execWinget(["uninstall", "--id", id, "--exact", ...UNINSTALL_FLAGS]);
    toast.style = Toast.Style.Success;
    toast.title = "Uninstalled";
    toast.message = id;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Uninstall failed";
    toast.message = error instanceof Error ? error.message : String(error);
    return false;
  }
}

/**
 * Parse winget's upgrade-all summary lines to extract success/failure counts.
 * Winget prints lines like:
 *   "2 package(s) installed successfully."
 *   "1 package(s) have failed to install."
 */
function parseUpgradeAllSummary(output: string): { succeeded: number; failed: number } | null {
  const succeededMatch = output.match(/(\d+)\s+package\(s\)\s+(?:installed|upgraded)\s+successfully/i);
  const failedMatch = output.match(/(\d+)\s+package\(s\)\s+(?:have\s+)?failed/i);
  if (!succeededMatch && !failedMatch) return null;
  return {
    succeeded: succeededMatch ? parseInt(succeededMatch[1], 10) : 0,
    failed: failedMatch ? parseInt(failedMatch[1], 10) : 0,
  };
}

function upgradeAllResultMessage(output: string, exitCode: number): { title: string; isPartial: boolean } {
  if (exitCode === 0) return { title: "All packages upgraded", isPartial: false };

  const summary = parseUpgradeAllSummary(output);
  if (summary) {
    const parts: string[] = [];
    if (summary.succeeded > 0) parts.push(`${summary.succeeded} upgraded`);
    if (summary.failed > 0) parts.push(`${summary.failed} failed`);
    return { title: parts.join(", "), isPartial: summary.failed > 0 };
  }

  return { title: "Some upgrades may have failed", isPartial: true };
}

/**
 * Upgrade a single package by ID, or upgrade all packages when no ID is given.
 */
export async function wingetUpgrade(id?: string): Promise<void> {
  const isAll = id === undefined;

  if (runInBackground()) {
    await showHUD(isAll ? "Upgrading all packages…" : `Upgrading ${id}…`);
    try {
      if (isAll) {
        const { output, exitCode } = await execWingetWithCode(["upgrade", "--all", ...INSTALL_FLAGS]);
        const { title } = upgradeAllResultMessage(output, exitCode);
        await showHUD(`${exitCode === 0 ? "✅" : "⚠️"} ${title}`);
      } else {
        await execWinget(["upgrade", "--id", id!, "--exact", ...INSTALL_FLAGS]);
        await showHUD(`✅ Upgraded ${id}`);
      }
    } catch {
      await showHUD(isAll ? "❌ Upgrade all failed" : `❌ Upgrade failed: ${id}`);
    }
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: isAll ? "Upgrading all packages…" : "Upgrading…",
    message: isAll ? undefined : id,
  });
  try {
    if (isAll) {
      const { output, exitCode } = await execWingetWithCode(["upgrade", "--all", ...INSTALL_FLAGS]);
      const { title, isPartial } = upgradeAllResultMessage(output, exitCode);
      toast.style = isPartial ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = title;
    } else {
      await execWinget(["upgrade", "--id", id!, "--exact", ...INSTALL_FLAGS]);
      toast.style = Toast.Style.Success;
      toast.title = "Upgraded";
      toast.message = id;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = isAll ? "Upgrade all failed" : "Upgrade failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
