import { execFile } from "node:child_process";
import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { environment, getPreferenceValues } from "@raycast/api";
import type {
  BridgeError,
  BridgeListResponse,
  BridgeLogoutResponse,
  BridgeSoundResponse,
  FindMyDevice,
  LoadState,
} from "./types";

const execFileAsync = promisify(execFile);
const PYICLOUD_VERSION = "2.6.5";
const SESSION_DIRECTORY = path.join(
  environment.supportPath,
  "pyicloud-session",
);
const MANAGED_VENV = path.join(environment.supportPath, "pyicloud-venv");
const MANAGED_PYTHON = path.join(MANAGED_VENV, "bin", "python");
const BRIDGE_PATH = path.join(environment.assetsPath, "findmy_bridge.py");
const AUTH_PATH = path.join(environment.assetsPath, "findmy_auth.py");
const REQUIREMENTS_PATH = path.join(
  environment.assetsPath,
  "pyicloud-requirements.txt",
);
const SETUP_SCRIPT = path.join(
  environment.supportPath,
  "setup-find-my.command",
);

function preferences(): Preferences.FindMyDevices {
  return getPreferenceValues<Preferences.FindMyDevices>();
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseBridgeError(stderr: string, fallback: string): BridgeError {
  const lines = stderr.trim().split("\n").reverse();
  for (const line of lines) {
    try {
      const value = JSON.parse(line) as BridgeError;
      if (value.ok === false && value.code && value.message) return value;
    } catch {
      // Continue until a JSON protocol line is found.
    }
  }
  return { ok: false, code: "PYICLOUD_ERROR", message: fallback };
}

async function runBridge<T>(
  command: string,
  commandArguments: string[] = [],
  appleAccount = preferences().appleAccount,
): Promise<T> {
  await mkdir(SESSION_DIRECTORY, { recursive: true, mode: 0o700 });

  try {
    const result = await execFileAsync(
      MANAGED_PYTHON,
      [
        BRIDGE_PATH,
        command,
        "--apple-account",
        appleAccount,
        "--session-dir",
        SESSION_DIRECTORY,
        ...commandArguments,
      ],
      {
        timeout: 45_000,
        maxBuffer: 2 * 1024 * 1024,
        env: {
          ...process.env,
          PYTHON_KEYRING_BACKEND: "keyring.backends.null.Keyring",
        },
      },
    );
    return JSON.parse(result.stdout.trim()) as T;
  } catch (error) {
    const processError = error as Error & { stderr?: string };
    throw parseBridgeError(processError.stderr ?? "", processError.message);
  }
}

export async function loadState(
  appleAccount: string,
  includeFamily: boolean,
): Promise<LoadState> {
  if (!(await exists(MANAGED_PYTHON))) {
    return { kind: "helper-missing" };
  }

  try {
    const response = await runBridge<BridgeListResponse>(
      "list",
      ["--include-family", includeFamily ? "true" : "false"],
      appleAccount,
    );
    return { kind: "ready", devices: response.devices };
  } catch (error) {
    const bridgeError = error as BridgeError;
    if (bridgeError.code === "AUTH_REQUIRED") {
      return { kind: "auth-required", message: bridgeError.message };
    }
    if (bridgeError.code === "NO_DEVICES") {
      return { kind: "ready", devices: [] };
    }
    return { kind: "error", message: bridgeError.message || String(error) };
  }
}

export async function playSound(device: FindMyDevice): Promise<void> {
  await runBridge<BridgeSoundResponse>("sound", [
    "--device-id",
    device.id,
    "--subject",
    "Find My Alert",
  ]);
}

export async function signOut(): Promise<BridgeLogoutResponse> {
  return runBridge<BridgeLogoutResponse>("logout");
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export async function openSetupInTerminal(): Promise<void> {
  const prefs = preferences();

  await mkdir(environment.supportPath, { recursive: true, mode: 0o700 });
  await mkdir(SESSION_DIRECTORY, { recursive: true, mode: 0o700 });

  const script = `#!/bin/zsh
set -e

VENV=${shellQuote(MANAGED_VENV)}
PYTHON=${shellQuote(MANAGED_PYTHON)}
SESSION_DIR=${shellQuote(SESSION_DIRECTORY)}
APPLE_ACCOUNT=${shellQuote(prefs.appleAccount)}
AUTH_HELPER=${shellQuote(AUTH_PATH)}
BRIDGE_HELPER=${shellQuote(BRIDGE_PATH)}
REQUIREMENTS=${shellQuote(REQUIREMENTS_PATH)}

export PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring

mkdir -p "$SESSION_DIR"
chmod 700 "$SESSION_DIR"

if [ ! -x "$PYTHON" ]; then
  printf '\nCreating the private PyiCloud environment.\n\n'
  if command -v uv >/dev/null 2>&1; then
    uv venv "$VENV"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m venv "$VENV"
    "$VENV/bin/python" -m ensurepip --upgrade
  else
    printf 'Python 3 or uv is required. Install one, then run this setup again.\n'
    exit 1
  fi
fi

printf 'Installing hash-verified PyiCloud ${PYICLOUD_VERSION} packages from PyPI.\n'
if command -v uv >/dev/null 2>&1; then
  uv pip install --python "$PYTHON" --require-hashes -r "$REQUIREMENTS"
else
  "$PYTHON" -m pip install --require-hashes -r "$REQUIREMENTS"
fi

printf '\nFind My Devices sign-in\n'
printf 'Your password and 2FA code stay in this Terminal window.\n'
printf 'Raycast does not receive them.\n'
printf 'The helper cannot read or write the macOS Keychain.\n'
printf 'This session can access more iCloud web data than only Find My.\n\n'

"$PYTHON" "$AUTH_HELPER" --apple-account "$APPLE_ACCOUNT" --session-dir "$SESSION_DIR"

printf '\nChecking Find My access...\n'
"$PYTHON" "$BRIDGE_HELPER" list --apple-account "$APPLE_ACCOUNT" --session-dir "$SESSION_DIR" --include-family true >/dev/null
printf '\nSetup is complete. Return to Raycast and select Refresh Devices.\n'
printf 'Press Return to close this Terminal window.\n'
read -r
`;

  await writeFile(SETUP_SCRIPT, script, { encoding: "utf8", mode: 0o700 });
  await chmod(SETUP_SCRIPT, 0o700);

  const appleScript = `
on run argv
  tell application "Terminal"
    activate
    do script quoted form of (item 1 of argv)
  end tell
end run
`;
  await execFileAsync("/usr/bin/osascript", ["-e", appleScript, SETUP_SCRIPT]);
}

export function helperVersion(): string {
  return PYICLOUD_VERSION;
}
