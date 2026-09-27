import { execFileSync } from "child_process";
import { existsSync, lstatSync } from "fs";
import { join } from "path";
import { PLIST_NAME } from "./config";
import { parseLaunchctlProgram, isValidHomebrewExec } from "./service-pure.mjs";
import { runServiceRestart } from "./service-restart.mjs";

export { parseLaunchctlProgram, isValidHomebrewExec };

// ── Absolute tool paths ───────────────────────────────────────────────
const LAUNCHCTL = "/bin/launchctl";
const ID = "/usr/bin/id";
const PLUTIL = "/usr/bin/plutil";

const STANDALONE_LABEL = PLIST_NAME;
const STANDALONE_PLIST_PATH = join(
  // Use homedir() only for path construction, never for execution
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("os").homedir(),
  "Library",
  "LaunchAgents",
  `${PLIST_NAME}.plist`,
);
const STANDALONE_EXEC_SUFFIX =
  ".local/bin/Switcheroo.app/Contents/MacOS/switcheroo";
const STANDALONE_EXPECTED_EXEC = join(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("os").homedir(),
  STANDALONE_EXEC_SUFFIX,
);

const HOMEBREW_LABEL = "homebrew.mxcl.switcheroo";

export type ServiceLayout = "standalone" | "homebrew";
export interface ServiceInfo {
  layout: ServiceLayout;
  label: string;
  executable: string;
}

function getUid(): string {
  return execFileSync(ID, ["-u"], { encoding: "utf-8" }).trim();
}

function getLaunchctlPrint(uid: string, label: string): string | null {
  try {
    return execFileSync(LAUNCHCTL, ["print", `gui/${uid}/${label}`], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

/** Resolve the one expected Homebrew executable by probing brew.
 * Returns the exact path only if it matches one of the allowlisted
 * official paths AND the file exists as a regular non-symlink file. */
function getHomebrewExpectedExec(): string | null {
  for (const prefix of ["/opt/homebrew", "/usr/local"]) {
    const brewBin = join(prefix, "bin", "brew");
    if (!existsSync(brewBin)) continue;
    try {
      const brewPrefix = execFileSync(brewBin, ["--prefix", "switcheroo"], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 5000,
      }).trim();
      const candidate = join(
        brewPrefix,
        "Switcheroo.app/Contents/MacOS/switcheroo",
      );
      // Must be an exact allowlisted path
      if (!isValidHomebrewExec(candidate)) continue;
      // Must exist as a regular file (not symlink)
      if (!existsSync(candidate)) continue;
      try {
        const lst = lstatSync(candidate);
        if (!lst.isFile()) continue;
      } catch {
        continue;
      }
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

/** Get the loaded job's program for a label. Returns null if not loaded. */
function getLoadedProgram(uid: string, label: string): string | null {
  const output = getLaunchctlPrint(uid, label);
  if (output === null) return null;
  return parseLaunchctlProgram(output);
}

/** Detect which service layout is active. Binds one install to one exact
 * executable. If both are loaded, throws. If neither, returns null.
 * For Homebrew, the loaded job program MUST exactly equal the executable
 * returned by getHomebrewExpectedExec (no dual-prefix mismatch). */
export function detectLayout(): ServiceInfo | null {
  const uid = getUid();

  const standaloneProg = getLoadedProgram(uid, STANDALONE_LABEL);
  const homebrewProg = getLoadedProgram(uid, HOMEBREW_LABEL);

  const standaloneActive =
    standaloneProg !== null && standaloneProg === STANDALONE_EXPECTED_EXEC;
  const homebrewProgValid = isValidHomebrewExec(homebrewProg ?? "");

  // For Homebrew: the loaded program must match the detected installation
  const homebrewExpected = getHomebrewExpectedExec();
  const homebrewActive =
    homebrewProgValid &&
    homebrewExpected !== null &&
    homebrewProg === homebrewExpected;

  if (standaloneActive && homebrewActive) {
    throw new Error(
      "Both standalone and Homebrew Switcheroo services are loaded — unsupported. Stop one before restarting.",
    );
  }

  if (standaloneActive) {
    return {
      layout: "standalone",
      label: STANDALONE_LABEL,
      executable: STANDALONE_EXPECTED_EXEC,
    };
  }

  if (homebrewActive) {
    return {
      layout: "homebrew",
      label: HOMEBREW_LABEL,
      executable: homebrewExpected!,
    };
  }

  return null;
}

/** Validate the standalone plist: lstat (not stat), regular file, owner,
 * exact Label, exact ProgramArguments[0]. */
function plistIsSwitcherooStandalone(): boolean {
  if (!existsSync(STANDALONE_PLIST_PATH)) return false;
  let lst;
  try {
    lst = lstatSync(STANDALONE_PLIST_PATH);
  } catch {
    return false;
  }
  if (!lst.isFile()) return false;
  if (lst.uid !== Number(getUid())) return false;

  try {
    const label = execFileSync(
      PLUTIL,
      ["-extract", "Label", "raw", "-o", "-", STANDALONE_PLIST_PATH],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
    if (label !== STANDALONE_LABEL) return false;
  } catch {
    return false;
  }

  try {
    const prog = execFileSync(
      PLUTIL,
      [
        "-extract",
        "ProgramArguments.0",
        "raw",
        "-o",
        "-",
        STANDALONE_PLIST_PATH,
      ],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
    return prog === STANDALONE_EXPECTED_EXEC;
  } catch {
    return false;
  }
}

/** Verify the standalone plist has KeepAlive=true (required for graceful
 * SIGTERM + relaunch). Returns true only if the plist contains a
 * KeepAlive key with value true. */
function plistKeepAliveTrue(): boolean {
  try {
    const keepAlive = execFileSync(
      PLUTIL,
      ["-extract", "KeepAlive", "raw", "-o", "-", STANDALONE_PLIST_PATH],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
    return keepAlive === "true" || keepAlive === "1";
  } catch {
    // KeepAlive key doesn't exist or plutil failed
    return false;
  }
}

/**
 * Type of the execFileSync-like function used internally.
 * Allows tests to inject a mock without touching real launchctl.
 */
export type ExecFn = (
  cmd: string,
  args: string[],
  opts?: { encoding?: string; stdio?: ("pipe" | "ignore" | "inherit")[] },
) => string;

/** Result of a restart operation (mirrors service-restart.mjs RestartResult). */
export interface RestartResult {
  command: string;
  args: string[];
  label: string;
  reason: "loaded" | "absent";
  message: string;
}

/**
 * Restart the Switcheroo service.
 *
 * - If no service is loaded and the standalone plist is valid → bootstrap.
 * - If standalone is loaded → identity-verified graceful `kill SIGTERM`
 *   (KeepAlive relaunches). Returns "Restart requested" — not completion.
 * - If Homebrew is loaded → identity-verified `kickstart -k`.
 *
 * The pure decision logic lives in service-restart.mjs (runServiceRestart)
 * so it can be tested without real launchctl calls. This wrapper wires
 * the real I/O functions into that decision engine and returns the result.
 */
export function restartService(): RestartResult {
  return runServiceRestart({
    detectLayout,
    plistIsStandalone: plistIsSwitcherooStandalone,
    plistKeepAlive: plistKeepAliveTrue,
    getLoadedProgram,
    getHomebrewExec: getHomebrewExpectedExec,
    getUid,
    getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
    exec: (cmd, args, opts) => {
      return execFileSync(cmd, args, {
        ...opts,
        encoding: "utf-8",
      }) as string;
    },
  });
}

export function isServiceRunning(): boolean {
  const info = detectLayout();
  if (info === null) return false;
  const uid = getUid();
  const output = getLaunchctlPrint(uid, info.label);
  if (output === null) return false;
  return output.includes("state = running") || output.includes("pid = ");
}
