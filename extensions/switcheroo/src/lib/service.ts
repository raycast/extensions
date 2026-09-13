import { execFileSync } from "child_process";
import { existsSync, lstatSync } from "fs";
import { join } from "path";
import { PLIST_NAME } from "./config";
import { parseLaunchctlProgram, isValidHomebrewExec } from "./service-pure.mjs";

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

export function restartService(): void {
  const uid = getUid();
  const info = detectLayout();

  if (info === null) {
    if (!plistIsSwitcherooStandalone()) {
      const homebrewExec = getHomebrewExpectedExec();
      if (homebrewExec) {
        throw new Error(
          "Switcheroo is not running. Start it with: brew services start switcheroo",
        );
      }
      throw new Error(
        "Switcheroo is not installed or not running. Install via `brew install switcheroo` or run ./install.sh.",
      );
    }
    execFileSync(
      LAUNCHCTL,
      ["bootstrap", `gui/${uid}`, STANDALONE_PLIST_PATH],
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    return;
  }

  if (info.layout === "standalone") {
    if (!plistIsSwitcherooStandalone()) {
      throw new Error(
        `Refusing to restart ${STANDALONE_LABEL}: plist validation failed`,
      );
    }
    execFileSync(LAUNCHCTL, ["bootout", `gui/${uid}/${STANDALONE_LABEL}`], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (!plistIsSwitcherooStandalone()) {
      throw new Error(
        `Refusing to re-bootstrap ${STANDALONE_LABEL}: plist changed after bootout (TOCTOU)`,
      );
    }
    execFileSync(
      LAUNCHCTL,
      ["bootstrap", `gui/${uid}`, STANDALONE_PLIST_PATH],
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  } else if (info.layout === "homebrew") {
    // Re-verify the loaded job program equals the expected executable
    // immediately before kickstart (TOCTOU protection)
    const currentProg = getLoadedProgram(uid, HOMEBREW_LABEL);
    if (currentProg !== info.executable) {
      throw new Error(
        `Refusing to kickstart ${HOMEBREW_LABEL}: loaded program changed (TOCTOU)`,
      );
    }
    execFileSync(
      LAUNCHCTL,
      ["kickstart", "-k", `gui/${uid}/${HOMEBREW_LABEL}`],
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  }
}

export function isServiceRunning(): boolean {
  const info = detectLayout();
  if (info === null) return false;
  const uid = getUid();
  const output = getLaunchctlPrint(uid, info.label);
  if (output === null) return false;
  return output.includes("state = running") || output.includes("pid = ");
}
