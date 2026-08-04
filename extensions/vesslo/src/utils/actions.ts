import { open, showToast, Toast, closeMainWindow } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { getBrewPath, normalizeBrewCaskToken } from "./brew";

const execFileAsync = promisify(execFile);

export const VESSLO_URL_SCHEME = "vesslo://";
const MAX_TOAST_MESSAGE_LENGTH = 100;
const NEW_TERMINAL_WINDOW_DELAY_SECONDS = 3;

function truncateMessage(message: string): string {
  return message.slice(0, MAX_TOAST_MESSAGE_LENGTH);
}

function quoteShellArgument(value: string): string {
  return `'${value.replace(/'/g, "'\"'\"'")}'`;
}

function quoteAppleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function parseAppStoreId(appStoreId: string | null | undefined): string {
  if (typeof appStoreId !== "string") {
    throw new Error("Invalid App Store ID");
  }

  const normalizedId = appStoreId.trim();
  if (!/^\d+$/.test(normalizedId)) {
    throw new Error("Invalid App Store ID");
  }
  return normalizedId;
}

async function showFailureToast(title: string, message: string) {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: truncateMessage(message),
  });
}

async function resolveBrewCommand(): Promise<string | null> {
  const brewPath = getBrewPath();
  if (brewPath) {
    return brewPath;
  }

  await showFailureToast(
    "Homebrew not found",
    "Install Homebrew or check /opt/homebrew/bin/brew and /usr/local/bin/brew",
  );
  return null;
}

async function resolveBrewCaskToken(
  caskName: string | null | undefined,
  appName = "this app",
): Promise<string | null> {
  const caskToken = normalizeBrewCaskToken(caskName);
  if (caskToken) {
    return caskToken;
  }

  await showFailureToast(
    "Invalid Homebrew cask",
    `${appName} does not have a valid cask token`,
  );
  return null;
}

async function runCommandInTerminal(command: string) {
  const quotedCommand = quoteAppleScriptString(command);
  await execFileAsync("osascript", [
    "-e",
    'tell application "Terminal"',
    "-e",
    "activate",
    "-e",
    "if (count of windows) > 0 then",
    "-e",
    `do script ${quotedCommand} in front window`,
    "-e",
    "else",
    "-e",
    'do script ""',
    "-e",
    `delay ${NEW_TERMINAL_WINDOW_DELAY_SECONDS}`,
    "-e",
    `do script ${quotedCommand} in front window`,
    "-e",
    "end if",
    "-e",
    "end tell",
  ]);
}

export async function openInVesslo(bundleId: string) {
  try {
    await closeMainWindow();
    await open(`${VESSLO_URL_SCHEME}app/${bundleId}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Vesslo",
      message: truncateMessage(String(error)),
    });
  }
}

export async function openUpdateInVesslo(bundleId: string) {
  try {
    await closeMainWindow();
    await open(`${VESSLO_URL_SCHEME}update/${bundleId}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to update in Vesslo",
      message: truncateMessage(String(error)),
    });
  }
}

export function getAppStoreUrl(
  appStoreId: string | null | undefined,
): string | null {
  try {
    return `macappstore://apps.apple.com/app/id${parseAppStoreId(appStoreId)}`;
  } catch {
    return null;
  }
}

export async function runBrewUpgrade(caskName: string, appName: string) {
  const brewPath = await resolveBrewCommand();
  const caskToken = await resolveBrewCaskToken(caskName, appName);
  if (!brewPath || !caskToken) {
    return;
  }

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${appName}...`,
    });

    const { stdout, stderr } = await execFileAsync(
      brewPath,
      ["upgrade", "--cask", caskToken],
      { maxBuffer: 1024 * 1024 * 10 },
    );

    const output = stdout + stderr;

    // Check if already up-to-date (explicit messages only)
    if (
      output.includes("already installed") ||
      output.includes("up-to-date") ||
      output.includes("No cask to upgrade")
    ) {
      await showToast({
        style: Toast.Style.Success,
        title: `${appName} is up-to-date`,
        message: "No update needed",
      });
      return;
    }

    // Update succeeded - check if app was running (needs restart)
    // Homebrew updates files even if app is running, but needs restart to apply
    const wasRunning =
      output.includes("currently running") ||
      output.includes("currently open") ||
      output.includes("Please quit");

    if (wasRunning) {
      await showToast({
        style: Toast.Style.Success,
        title: `${appName} updated!`,
        message: "Restart app to apply changes",
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: `${appName} updated!`,
        message: truncateMessage(output) || "Update complete",
      });
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? truncateMessage(error.message) : "Unknown error";

    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to update ${appName}`,
      message: errorMessage,
    });
  }
}

export async function runBulkBrewUpgrade(caskNames: string[]) {
  const uniqueCaskTokens = Array.from(
    new Set(
      caskNames
        .map((caskName) => normalizeBrewCaskToken(caskName))
        .filter((caskName): caskName is string => caskName !== null),
    ),
  );

  if (uniqueCaskTokens.length === 0) {
    await showFailureToast(
      "No valid Homebrew casks",
      "Vesslo export did not include valid Homebrew cask tokens",
    );
    return;
  }

  const brewPath = await resolveBrewCommand();
  if (!brewPath) {
    return;
  }

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Updating Homebrew apps...",
      message: `${uniqueCaskTokens.length} cask(s)`,
    });

    const { stdout, stderr } = await execFileAsync(
      brewPath,
      ["upgrade", "--cask", ...uniqueCaskTokens],
      { maxBuffer: 1024 * 1024 * 50 },
    );
    const output = stdout + stderr;

    await showToast({
      style: Toast.Style.Success,
      title: "Homebrew update complete",
      message: truncateMessage(output) || "Update complete",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? truncateMessage(error.message) : "Unknown error";

    await showToast({
      style: Toast.Style.Failure,
      title: "Homebrew update failed",
      message: errorMessage,
    });
  }
}

export async function runBrewUpgradeInTerminal(caskName: string) {
  const brewPath = await resolveBrewCommand();
  const caskToken = await resolveBrewCaskToken(caskName);
  if (!brewPath || !caskToken) {
    return;
  }

  const command = `${brewPath} upgrade --cask ${quoteShellArgument(caskToken)}`;

  try {
    await closeMainWindow();
    await runCommandInTerminal(command);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Terminal",
      message: truncateMessage(String(error)),
    });
  }
}

export async function runMasUpgradeInTerminal(appStoreId: string) {
  let validatedId: string;
  try {
    validatedId = parseAppStoreId(appStoreId);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid App Store ID",
      message: `"${truncateMessage(appStoreId)}" is not a valid numeric ID`,
    });
    return;
  }

  const command = `mas upgrade ${validatedId}`;

  try {
    await closeMainWindow();
    await runCommandInTerminal(command);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Terminal",
      message: truncateMessage(String(error)),
    });
  }
}
