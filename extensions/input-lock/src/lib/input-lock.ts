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
const PID_FILE = path.join(environment.supportPath, `${HELPER_NAME}.pid`);

const ACCESSIBILITY_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

export type LockOptions = {
  /** Also freeze the cursor and swallow clicks, scrolls and gestures. */
  blockPointer: boolean;
  /** Per-lock auto-unlock override such as "5m", "90s" or "1h30m"; falls back to the preference. */
  duration?: string;
};

export async function lockInput({ blockPointer, duration }: LockOptions) {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const sequence = prefs.unlockSequence.trim();
  const timeoutSeconds = duration?.trim()
    ? parseDuration(duration)
    : parseDuration(prefs.autoUnlockMinutes || "0", "m");

  if (sequence.length < 3) {
    await showToast({ style: Toast.Style.Failure, title: "Unlock sequence must be at least 3 characters" });
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
  if (await isAlreadyLocked()) {
    await showHUD("Input is already locked");
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
    INPUT_LOCK_SEQUENCE: sequence,
    INPUT_LOCK_TIMEOUT: String(timeoutSeconds),
    INPUT_LOCK_BLOCK_POINTER: blockPointer ? "1" : "0",
    INPUT_LOCK_OVERLAY: prefs.showOverlay ? "1" : "0",
    INPUT_LOCK_SOUND: prefs.playUnlockSound ? "1" : "0",
  });

  if (result.ok) {
    if (prefs.showOverlay) {
      await closeMainWindow({ clearRootSearch: true });
    } else {
      await showHUD(blockPointer ? "Keyboard & trackpad locked" : "Keyboard locked", { clearRootSearch: true });
    }
    return;
  }

  if (result.code === "accessibility" || result.code === "tap") {
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
 */
export function parseDuration(input: string, bareUnit: "s" | "m" = "m"): number | undefined {
  const text = input.trim().toLowerCase().replace(/\s+/g, "");
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text) * (bareUnit === "m" ? 60 : 1));

  const parts = [...text.matchAll(/(\d+(?:\.\d+)?)(h|m|s)/g)];
  if (parts.length === 0 || parts.map((p) => p[0]).join("") !== text) return undefined;
  const unitSeconds = { h: 3600, m: 60, s: 1 } as const;
  return Math.round(parts.reduce((total, [, n, unit]) => total + Number(n) * unitSeconds[unit as "h" | "m" | "s"], 0));
}

/**
 * Installs the helper into the support directory. Uses the prebuilt universal binary from
 * assets when present, otherwise compiles the Swift source (needs Xcode Command Line Tools).
 * Re-installs whenever the bundled binary or source changes.
 */
async function ensureHelper() {
  const bundled = fs.existsSync(BUNDLED_HELPER);
  const input = await fs.promises.readFile(bundled ? BUNDLED_HELPER : HELPER_SOURCE);
  const hash = createHash("sha256").update(input).digest("hex");
  const installedHash = await fs.promises.readFile(HELPER_HASH, "utf8").catch(() => "");
  if (installedHash === hash && fs.existsSync(HELPER_BINARY)) return;

  await fs.promises.mkdir(environment.supportPath, { recursive: true });
  if (bundled) {
    await fs.promises.copyFile(BUNDLED_HELPER, HELPER_BINARY);
    await fs.promises.chmod(HELPER_BINARY, 0o755);
    await fs.promises.writeFile(HELPER_HASH, hash);
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Building lock helper (first run)…" });
  await execFileAsync("/usr/bin/xcrun", ["swiftc", "-O", "-swift-version", "5", "-o", HELPER_BINARY, HELPER_SOURCE], {
    timeout: 180_000,
  });
  await fs.promises.writeFile(HELPER_HASH, hash);
  toast.hide();
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
      if (result.ok) {
        fs.writeFileSync(PID_FILE, String(child.pid));
        child.unref();
      }
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

async function isAlreadyLocked() {
  const pid = Number(await fs.promises.readFile(PID_FILE, "utf8").catch(() => ""));
  if (!pid) return false;
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-p", String(pid), "-o", "comm="]);
    return stdout.trim().endsWith(HELPER_NAME);
  } catch {
    return false;
  }
}
