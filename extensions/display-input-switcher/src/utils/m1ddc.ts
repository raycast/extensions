import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync, accessSync, constants, chmodSync } from "fs";

function exec(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      // m1ddc may exit with non-zero codes but still produce useful output
      if (error && !stdout && !stderr) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

const KNOWN_PATHS = ["/opt/homebrew/bin/m1ddc", "/usr/local/bin/m1ddc"];

function isBinReady(filePath: string): boolean {
  try {
    if (!existsSync(filePath)) return false;
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    try {
      chmodSync(filePath, "755");
      return true;
    } catch {
      return false;
    }
  }
}

async function installViaBrew(): Promise<boolean> {
  const brewPath = existsSync("/opt/homebrew/bin/brew") ? "/opt/homebrew/bin/brew" : "/usr/local/bin/brew";
  if (!existsSync(brewPath)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Homebrew not found",
      message: "Install Homebrew first, then run: brew install m1ddc",
      primaryAction: {
        title: "Open Homebrew Website",
        onAction: () => open("https://brew.sh"),
      },
    });
    return false;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Installing m1ddc",
    message: "Running brew install m1ddc...",
  });

  try {
    await exec(brewPath, ["install", "m1ddc"]);
    toast.style = Toast.Style.Success;
    toast.title = "m1ddc installed";
    toast.message = undefined;
    return true;
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to install m1ddc";
    toast.message = "Try manually: brew install m1ddc";
    return false;
  }
}

async function getCliPath(): Promise<string | null> {
  const { m1ddcPath } = getPreferenceValues<Preferences>();

  // 1. User-configured path
  if (m1ddcPath) {
    if (!isBinReady(m1ddcPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "m1ddc not found",
        message: `Not found at configured path: ${m1ddcPath}`,
      });
      return null;
    }
    return m1ddcPath;
  }

  // 2. Check known Homebrew paths
  for (const p of KNOWN_PATHS) {
    if (isBinReady(p)) return p;
  }

  // 3. Auto-install via brew
  const installed = await installViaBrew();
  if (!installed) return null;

  // Check again after install
  for (const p of KNOWN_PATHS) {
    if (isBinReady(p)) return p;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "m1ddc installation failed",
    message: "Try manually: brew install m1ddc",
  });
  return null;
}

export interface DisplayInfo {
  id: number;
  name: string;
  uuid: string;
}

export async function listDisplays(): Promise<DisplayInfo[]> {
  const cliPath = await getCliPath();
  if (!cliPath) return [];
  const { stdout, stderr } = await exec(cliPath, ["display", "list"]);
  const output = stdout || stderr;
  const displays: DisplayInfo[] = [];
  const regex = /\[(\d+)\]\s+(.+?)\s+\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(output)) !== null) {
    displays.push({ id: parseInt(match[1], 10), name: match[2].trim(), uuid: match[3] });
  }
  return displays;
}

export async function getFirstExternalDisplay(): Promise<DisplayInfo | null> {
  const displays = await listDisplays();
  // Skip display with "(null)" name — that's typically the built-in display
  return displays.find((d) => d.name !== "(null)") ?? displays[0] ?? null;
}

export async function switchInputSource(displayId: number, inputSourceValue: number): Promise<string | null> {
  const cliPath = await getCliPath();
  if (!cliPath) return null;
  const { stdout, stderr } = await exec(cliPath, [
    "display",
    String(displayId),
    "set",
    "input",
    String(inputSourceValue),
  ]);
  return stdout || stderr;
}

export async function readInputSource(displayId: number): Promise<string | null> {
  const cliPath = await getCliPath();
  if (!cliPath) return null;
  const { stdout, stderr } = await exec(cliPath, ["display", String(displayId), "get", "input"]);
  return stdout || stderr;
}
