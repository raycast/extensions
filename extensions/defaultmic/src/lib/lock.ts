import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const LABEL = "com.defaultmic.lock";

function supportDir() {
  return path.join(os.homedir(), "Library", "Application Support", "defaultmic");
}

function scriptPath() {
  return path.join(supportDir(), "lock-mic.sh");
}

function targetPath() {
  return path.join(supportDir(), "target-mic.txt");
}

function logPath() {
  return path.join(supportDir(), "lock.log");
}

function plistPath() {
  return path.join(os.homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
}

function launchctlDomain() {
  const uid = typeof process.getuid === "function" ? process.getuid() : os.userInfo().uid;
  return `gui/${uid}`;
}

async function ensureSupportFiles() {
  await fs.mkdir(supportDir(), { recursive: true });

  const script = `#!/bin/zsh
TARGET_FILE="${targetPath()}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
SWITCH_BIN="$(command -v SwitchAudioSource)"

while true; do
  if [[ -z "$SWITCH_BIN" ]]; then
    sleep 10
    SWITCH_BIN="$(command -v SwitchAudioSource)"
    continue
  fi

  target="$(cat "$TARGET_FILE" 2>/dev/null)"
  if [[ -n "$target" ]]; then
    current="$("$SWITCH_BIN" -c -t input 2>/dev/null)"
    if [[ "$current" != "$target" ]]; then
      "$SWITCH_BIN" -t input -s "$target" >/dev/null 2>&1
    fi
  fi
  sleep 2
done
`;

  await fs.writeFile(scriptPath(), script, "utf8");
  await fs.chmod(scriptPath(), 0o755);
}

async function writePlist() {
  await fs.mkdir(path.dirname(plistPath()), { recursive: true });

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>${scriptPath()}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${logPath()}</string>
  <key>StandardErrorPath</key>
  <string>${logPath()}</string>
</dict>
</plist>
`;

  await fs.writeFile(plistPath(), plist, "utf8");
}

async function stopAgent() {
  try {
    await execFileAsync("/bin/launchctl", ["bootout", launchctlDomain(), plistPath()]);
  } catch {
    // Ignore bootout errors if it was not loaded.
  }
}

async function startAgent() {
  await stopAgent();
  await execFileAsync("/bin/launchctl", ["bootstrap", launchctlDomain(), plistPath()]);
}

export async function enableMicLock(targetMic: string) {
  await ensureSupportFiles();
  await fs.writeFile(targetPath(), targetMic, "utf8");
  await writePlist();
  await startAgent();
}

export async function disableMicLock() {
  await stopAgent();
}

export async function updateLockedMicTarget(targetMic: string) {
  await fs.mkdir(supportDir(), { recursive: true });
  await fs.writeFile(targetPath(), targetMic, "utf8");
}
