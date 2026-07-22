import { closeMainWindow, environment, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

type Preferences = {
  balatroPath?: string;
  lovelyPath?: string;
};

const execFileAsync = promisify(execFile);
const applicationSupport = path.join(os.homedir(), "Library", "Application Support", "Balatro");
const bmmDatabase = path.join(applicationSupport, "bmm_storage.db");
const defaultLovelyPath = path.join(applicationSupport, "bins", "liblovely.dylib");
const gameExecutableParts = ["Contents", "MacOS", "love"];
const gameDataParts = ["Contents", "Resources", "Balatro.love"];
const logPath = path.join(environment.supportPath, "launch-modded-balatro.log");

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function writeLog(event: string, details?: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${event}${details ? `: ${details}` : ""}\n`;

  try {
    await fs.mkdir(environment.supportPath, { recursive: true });
    await fs.appendFile(logPath, line, "utf8");
  } catch {
    // Diagnostic logging must never block launching or hide its original error.
  }
}

function trimmedPath(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? path.resolve(trimmed.replace(/^~(?=\/|$)/, os.homedir())) : undefined;
}

async function getBmmBalatroPath(): Promise<string | undefined> {
  try {
    await fs.access(bmmDatabase);
    const { stdout } = await execFileAsync(
      "/usr/bin/sqlite3",
      ["-readonly", bmmDatabase, "SELECT value FROM settings WHERE setting = 'installation_path' LIMIT 1;"],
      { timeout: 2_000 },
    );
    return trimmedPath(stdout);
  } catch (error) {
    await writeLog("Could not read BMM installation path", errorMessage(error));
    return undefined;
  }
}

async function isBalatroBundle(candidate: string): Promise<boolean> {
  try {
    await Promise.all([
      fs.access(path.join(candidate, ...gameExecutableParts)),
      fs.access(path.join(candidate, ...gameDataParts)),
    ]);
    return candidate.toLowerCase().endsWith(".app");
  } catch {
    return false;
  }
}

async function findBalatroBundle(root: string, remainingDepth = 4): Promise<string | undefined> {
  if (await isBalatroBundle(root)) return root;
  if (remainingDepth === 0) return undefined;

  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return undefined;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const found = await findBalatroBundle(path.join(root, entry.name), remainingDepth - 1);
    if (found) return found;
  }

  return undefined;
}

async function launch(): Promise<void> {
  await writeLog("Launch requested", `BMM database=${bmmDatabase}`);

  if (process.platform !== "darwin") {
    throw new Error("This command currently supports the macOS Balatro Mod Manager launcher.");
  }

  const preferences = getPreferenceValues<Preferences>();
  const configuredGamePath = trimmedPath(preferences.balatroPath) ?? (await getBmmBalatroPath());
  if (!configuredGamePath) {
    throw new Error("Balatro Mod Manager has no saved Balatro path. Set one in BMM or add a path override in this command's preferences.");
  }

  const appBundle = await findBalatroBundle(configuredGamePath);
  if (!appBundle) {
    throw new Error(`Could not find a valid Balatro.app below ${configuredGamePath}. Update BMM or set a path override.`);
  }

  const lovelyPath = trimmedPath(preferences.lovelyPath) ?? defaultLovelyPath;
  try {
    await fs.access(lovelyPath);
  } catch {
    throw new Error(`Lovely was not found at ${lovelyPath}. Install or repair Lovely in Balatro Mod Manager, or set a path override.`);
  }

  await writeLog("Launching Balatro", `app=${appBundle}; workingDirectory=${configuredGamePath}; lovely=${lovelyPath}`);

  const child = spawn(path.join(appBundle, ...gameExecutableParts), [], {
    cwd: configuredGamePath,
    detached: true,
    env: { ...process.env, DYLD_INSERT_LIBRARIES: lovelyPath },
    windowsHide: true,
    stdio: "ignore",
  });
  await new Promise<void>((resolve, reject) => {
    child.once("error", (error) => {
      void writeLog("Balatro process could not start", errorMessage(error));
      reject(error);
    });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });

  await writeLog("Balatro process started", `pid=${child.pid ?? "unknown"}`);
  await closeMainWindow();
  await showHUD("Launching modded Balatro…");
}

export default async function launchModdedBalatro(): Promise<void> {
  try {
    await launch();
  } catch (error) {
    const message = errorMessage(error);
    await writeLog("Launch failed", message);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not launch modded Balatro",
      message,
    });
  }
}
