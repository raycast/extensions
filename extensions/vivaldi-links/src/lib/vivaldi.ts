import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export type VivaldiProfile = {
  /** Directory name inside the user data folder, e.g. `Default` or `Profile 4`. */
  directory: string;
  /** Name the user gave the profile in Vivaldi, e.g. `Trabalho`. */
  name: string;
};

export type LaunchMode = "new-window" | "new-tab";

export class VivaldiNotFoundError extends Error {
  constructor() {
    super("Vivaldi was not found on this machine.");
    this.name = "VivaldiNotFoundError";
  }
}

/**
 * Raycast ships as a packaged (MSIX) app, so `LOCALAPPDATA` can be handed to us — and to
 * anything we spawn — already redirected into `...\AppData\Local\Temp`. Chromium derives
 * its default user data directory from that variable, which is how a launch can silently
 * end up in a brand new, empty profile tree instead of the real one. Derive the roots from
 * the user profile first and never trust a redirected value.
 */
function localAppDataRoots() {
  const roots = [
    process.env.USERPROFILE ? join(process.env.USERPROFILE, "AppData", "Local") : "",
    homedir() ? join(homedir(), "AppData", "Local") : "",
    process.env.LOCALAPPDATA ?? "",
  ];

  return unique(roots.filter((root) => root && !/[\\/]Temp([\\/]|$)/i.test(root)));
}

/** Vivaldi installs per-user by default; machine-wide and 32-bit installers land elsewhere. */
function installRoots() {
  return unique([
    ...localAppDataRoots(),
    process.env["ProgramFiles"] ?? "",
    process.env["ProgramFiles(x86)"] ?? "",
  ]).filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

/** Absolute path of `vivaldi.exe`, or undefined when Vivaldi is not installed. */
export function findExecutable() {
  return installRoots()
    .map((root) => join(root, "Vivaldi", "Application", "vivaldi.exe"))
    .find((candidate) => existsSync(candidate));
}

/**
 * The real user data directory — the one holding `Local State`. Checking for that file
 * rather than the folder rejects an empty tree left behind by a redirected launch.
 */
export function findUserDataDirectory() {
  return localAppDataRoots()
    .map((root) => join(root, "Vivaldi", "User Data"))
    .find((candidate) => existsSync(join(candidate, "Local State")));
}

type LocalState = {
  profile?: {
    last_used?: string;
    info_cache?: Record<string, { name?: string }>;
  };
};

function readLocalState(userDataDirectory: string): LocalState | undefined {
  try {
    return JSON.parse(readFileSync(join(userDataDirectory, "Local State"), "utf-8"));
  } catch {
    return undefined;
  }
}

/**
 * Profiles as Vivaldi knows them, plus the one it considers current. `Default` first, then
 * the numbered ones in natural order, so the list matches Vivaldi's own profile switcher.
 */
export function readProfiles(): {
  profiles: VivaldiProfile[];
  lastUsed?: string;
} {
  const userDataDirectory = findUserDataDirectory();

  if (!userDataDirectory) {
    return { profiles: [] };
  }

  const localState = readLocalState(userDataDirectory);
  const infoCache = localState?.profile?.info_cache ?? {};

  const profiles = Object.entries(infoCache)
    .filter(([directory]) => existsSync(join(userDataDirectory, directory)))
    .map(([directory, info]) => ({
      directory,
      name: info?.name?.trim() || directory,
    }))
    .sort((a, b) => {
      if (a.directory === "Default") return -1;
      if (b.directory === "Default") return 1;
      return a.directory.localeCompare(b.directory, undefined, {
        numeric: true,
      });
    });

  const lastUsed = localState?.profile?.last_used;

  return {
    profiles,
    lastUsed: typeof lastUsed === "string" && lastUsed.length > 0 ? lastUsed : undefined,
  };
}

type OpenOptions = {
  url: string;
  mode: LaunchMode;
  /** Profile directory to force. Empty means "whichever profile Vivaldi last used". */
  profile?: string;
};

/**
 * Launches `vivaldi.exe` directly instead of handing the URL to the shell.
 *
 * The shell always reuses the last focused window of whichever browser owns the protocol,
 * so it can neither guarantee a new window nor guarantee Vivaldi at all when another
 * browser is the default one. Spawning the executable does both.
 */
export function openInVivaldi({ url, mode, profile }: OpenOptions) {
  const executable = findExecutable();

  if (!executable) {
    throw new VivaldiNotFoundError();
  }

  const args: string[] = [];

  if (mode === "new-window") {
    args.push("--new-window");
  }

  const userDataDirectory = findUserDataDirectory();

  // Pinning the data directory is what keeps a launch attached to the real Vivaldi — with
  // its accounts, themes and sessions — instead of a fresh tree under the temp folder.
  if (userDataDirectory) {
    args.push(`--user-data-dir=${userDataDirectory}`);
  }

  // Without an explicit profile Vivaldi opens the last one it used, which with several
  // profiles is rarely the intended one.
  const resolvedProfile = profile || readProfiles().lastUsed;

  if (resolvedProfile) {
    args.push(`--profile-directory=${resolvedProfile}`);
  }

  args.push(url);

  // No `shell: true`, and arguments as an array: the URL can never be re-parsed as a
  // command. Detached and unreferenced so Vivaldi outlives the Raycast command.
  const child = spawn(executable, args, { detached: true, stdio: "ignore" });
  child.unref();
}
