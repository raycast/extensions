import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { execWinget, execWingetWithCode } from "./commands";
export function runInBackground(): boolean {
  return getPreferenceValues<Preferences>().runInBackground;
}

function parseWingetMessage(output: string, fallback: string): string {
  const lines = output
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[-\\\/|]+$/.test(l));
  return lines.at(-1) ?? fallback;
}

function isNoopInstall(output: string): boolean {
  const text = output.toLowerCase();
  return (
    text.includes("found an existing package already installed") &&
    (text.includes("no available upgrade found") || text.includes("no newer package versions are available"))
  );
}

// --accept-package-agreements is only valid for install/upgrade, not uninstall
const INSTALL_FLAGS = [
  "--silent",
  "--accept-package-agreements",
  "--accept-source-agreements",
  "--disable-interactivity",
];

const UNINSTALL_FLAGS = ["--silent", "--accept-source-agreements", "--disable-interactivity"];

export async function wingetInstall(id: string): Promise<boolean> {
  if (runInBackground()) {
    await showHUD(`Installing ${id}…`);
    try {
      const { output, exitCode } = await execWingetWithCode(["install", "--id", id, "--exact", ...INSTALL_FLAGS]);
      if (exitCode === 0) {
        if (isNoopInstall(output)) {
          await showHUD(`ℹ️ Already installed: ${id}`);
          return false;
        }
        await showHUD(`✅ Installed ${id}`);
        return true;
      }
      await showHUD(`❌ ${parseWingetMessage(output, `Install failed: ${id}`)}`);
      return false;
    } catch {
      await showHUD(`❌ Install failed: ${id}`);
      return false;
    }
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Installing…", message: id });
  try {
    const { output, exitCode } = await execWingetWithCode(["install", "--id", id, "--exact", ...INSTALL_FLAGS]);
    if (exitCode === 0) {
      if (isNoopInstall(output)) {
        toast.style = Toast.Style.Success;
        toast.title = "Already installed";
        toast.message = "No newer version available";
        return false;
      }
      toast.style = Toast.Style.Success;
      toast.title = "Installed";
      toast.message = id;
      return true;
    }
    toast.style = Toast.Style.Failure;
    toast.title = "Install failed";
    toast.message = parseWingetMessage(output, id);
    return false;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Install failed";
    toast.message = error instanceof Error ? error.message : String(error);
    return false;
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
export async function wingetUpgrade(id?: string): Promise<boolean> {
  const isAll = id === undefined;

  if (runInBackground()) {
    await showHUD(isAll ? "Upgrading all packages…" : `Upgrading ${id}…`);
    try {
      if (isAll) {
        const { output, exitCode } = await execWingetWithCode(["upgrade", "--all", ...INSTALL_FLAGS]);
        const { title } = upgradeAllResultMessage(output, exitCode);
        await showHUD(`${exitCode === 0 ? "✅" : "⚠️"} ${title}`);
        return exitCode === 0;
      } else {
        const { output, exitCode } = await execWingetWithCode(["upgrade", "--id", id!, "--exact", ...INSTALL_FLAGS]);
        if (exitCode === 0) {
          await showHUD(`✅ Upgraded ${id}`);
          return true;
        } else {
          const msg = parseWingetMessage(output, "Upgrade failed");
          await showHUD(`❌ ${msg}`);
          return false;
        }
      }
    } catch {
      await showHUD(isAll ? "❌ Upgrade all failed" : `❌ Upgrade failed: ${id}`);
      return false;
    }
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
      return !isPartial;
    } else {
      const { output, exitCode } = await execWingetWithCode(["upgrade", "--id", id!, "--exact", ...INSTALL_FLAGS]);
      if (exitCode === 0) {
        await showToast({ style: Toast.Style.Success, title: "Upgraded", message: id });
        return true;
      } else {
        const msg = parseWingetMessage(output, id!);
        await showToast({ style: Toast.Style.Failure, title: "Upgrade failed", message: msg });
        return false;
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    toast.style = Toast.Style.Failure;
    toast.title = isAll ? "Upgrade all failed" : "Upgrade failed";
    toast.message = errMsg;
    return false;
  }
}
