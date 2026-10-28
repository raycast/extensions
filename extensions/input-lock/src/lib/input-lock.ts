import { closeMainWindow, environment, getPreferenceValues, open, showHUD, showToast, Toast } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const HELPER_NAME = "input-lock-helper";
const BUNDLED_HELPER = path.join(environment.assetsPath, HELPER_NAME);
const HELPER_SOURCE = path.join(environment.assetsPath, `${HELPER_NAME}.swift`);
const HELPER_BINARY = path.join(environment.supportPath, HELPER_NAME);
const HELPER_HASH = `${HELPER_BINARY}.sha256`;
const LOCK_FILE = path.join(environment.supportPath, `${HELPER_NAME}.lock`);

const ACCESSIBILITY_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

export type LockOptions = {
  /** Also freeze the cursor and swallow clicks, scrolls and gestures. */
  blockPointer: boolean;
  /** Per-lock auto-unlock override such as "5m", "90s" or "1h30m"; falls back to the preference. */
  duration?: string;
};

export async function lockInput({ blockPointer, duration }: LockOptions) {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const method = prefs.unlockMethod ?? "touchid";
  const sequence = (prefs.unlockSequence ?? "").trim();
  const timeoutSeconds = duration?.trim()
    ? parseDuration(duration)
    : parseDuration(prefs.autoUnlockMinutes || "0", "m");

  if (method !== "touchid" && sequence.length < 3) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Set an unlock sequence of at least 3 characters",
      message: "Or switch Unlock Method to Touch ID in the extension preferences",
    });
    return;
  }
  if (timeoutSeconds === undefined) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid auto-unlock duration",
      message: 'Use something like "5m", "90s", "1h30m", or a number of minutes (0 = never)',
    });
    return;
  }
  try {
    await ensureHelper();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't build the lock helper",
      message: "Install Xcode Command Line Tools: xcode-select --install",
    });
    console.error(error);
    return;
  }

  const result = await startHelper({
    INPUT_LOCK_METHOD: method,
    INPUT_LOCK_SEQUENCE: method === "touchid" ? "" : sequence,
    INPUT_LOCK_TIMEOUT: String(timeoutSeconds),
    INPUT_LOCK_BLOCK_POINTER: blockPointer ? "1" : "0",
    INPUT_LOCK_OVERLAY: prefs.showOverlay ? "1" : "0",
    INPUT_LOCK_SOUND: prefs.playUnlockSound ? "1" : "0",
    INPUT_LOCK_LOCKFILE: LOCK_FILE,
  });

  if (result.ok) {
    if (prefs.showOverlay) {
      await closeMainWindow({ clearRootSearch: true });
    } else {
      await showHUD(blockPointer ? "Keyboard & trackpad locked" : "Keyboard locked", { clearRootSearch: true });
    }
    return;
  }

  if (result.code === "already-locked") {
    await showHUD("Input is already locked");
  } else if (result.code === "touchid-unavailable") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Touch ID isn't available",
      message: "Open the lid or set up a fingerprint, or switch Unlock Method to include the typed sequence",
    });
  } else if (result.code === "accessibility" || result.code === "tap") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Permission needed",
      message: result.message,
      primaryAction: { title: "Open Privacy Settings", onAction: () => open(ACCESSIBILITY_SETTINGS) },
    });
  } else {
    await showToast({ style: Toast.Style.Failure, title: "Couldn't lock input", message: result.message });
  }
}

/**
 * Parses "5m", "90s", "1h30m" or a bare number (in `bareUnit`) into seconds.
 * Returns undefined for anything it doesn't understand; 0 means "never".
 * Positive values round up, so a short duration never becomes 0 ("never").
 */
export function parseDuration(input: string, bareUnit: "s" | "m" = "m"): number | undefined {
  const text = input.trim().toLowerCase().replace(/\s+/g, "");
  if (/^\d+(\.\d+)?$/.test(text)) return roundUpSeconds(Number(text) * (bareUnit === "m" ? 60 : 1));

  const parts = [...text.matchAll(/(\d+(?:\.\d+)?)(h|m|s)/g)];
  if (parts.length === 0 || parts.map((p) => p[0]).join("") !== text) return undefined;
  const unitSeconds = { h: 3600, m: 60, s: 1 } as const;
  return roundUpSeconds(
    parts.reduce((total, [, n, unit]) => total + Number(n) * unitSeconds[unit as "h" | "m" | "s"], 0),
  );
}

/** Rounds up to whole seconds, tolerating float noise such as 1.1 * 60 = 66.00000000000001. */
function roundUpSeconds(seconds: number) {
  return seconds > 0 ? Math.ceil(seconds - 1e-9) : 0;
}

/**
 * Installs the helper into the support directory. Uses the prebuilt universal binary from
 * assets when present, otherwise compiles the Swift source (needs Xcode Command Line Tools).
 * Re-installs whenever the bundled binary or source changes. Installs go to a temp file and are
 * renamed into place, so a helper that is already running keeps its own (old) file intact.
 */
async function ensureHelper() {
  const bundled = fs.existsSync(BUNDLED_HELPER);
  const input = await fs.promises.readFile(bundled ? BUNDLED_HELPER : HELPER_SOURCE);
  const hash = createHash("sha256").update(input).digest("hex");
  const installedHash = await fs.promises.readFile(HELPER_HASH, "utf8").catch(() => "");
  if (installedHash === hash && fs.existsSync(HELPER_BINARY)) return;

  await fs.promises.mkdir(environment.supportPath, { recursive: true });
  const temp = `${HELPER_BINARY}.${process.pid}.tmp`;
  try {
    if (bundled) {
      await fs.promises.copyFile(BUNDLED_HELPER, temp);
    } else {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Building lock helper (first run)…" });
      await execFileAsync("/usr/bin/xcrun", ["swiftc", "-O", "-swift-version", "5", "-o", temp, HELPER_SOURCE], {
        timeout: 180_000,
      });
      toast.hide();
    }
    await fs.promises.chmod(temp, 0o755);
    await fs.promises.rename(temp, HELPER_BINARY);
  } finally {
    await fs.promises.rm(temp, { force: true });
  }
  await fs.promises.writeFile(HELPER_HASH, hash);
}

type StartResult = { ok: true } | { ok: false; code: string; message: string };

/** Launches the helper detached and waits for its READY / ERROR handshake line. */
function startHelper(config: Record<string, string>): Promise<StartResult> {
  return new Promise((resolve) => {
    const child = spawn(HELPER_BINARY, [], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...config },
    });

    let output = "";
    let stderr = "";
    let settled = false;

    const finish = (result: StartResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.destroy();
      child.stderr.destroy();
      if (result.ok) child.unref();
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish({ ok: false, code: "timeout", message: "The lock helper didn't start in time." });
    }, 15_000);

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const line = output.split("\n")[0];
      if (!output.includes("\n")) return;
      if (line === "READY") {
        finish({ ok: true });
      } else {
        const [, code = "unknown", ...rest] = line.split(":");
        finish({ ok: false, code, message: rest.join(":") || line });
      }
    });
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (error) => finish({ ok: false, code: "spawn", message: error.message }));
    child.on("exit", (code) =>
      finish({ ok: false, code: "exit", message: stderr.trim() || `Lock helper exited with code ${code}` }),
    );
  });
}
