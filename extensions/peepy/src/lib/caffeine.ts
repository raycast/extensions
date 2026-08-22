import { environment } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

export type CaffeineMode = "indefinite" | "timed";

export type RunningCaffeineState = {
  pid: number;
  keepDisplayAwake: boolean;
  mode: CaffeineMode;
  startedAt: string;
  endsAt?: string;
  /** Process creation timestamp (epoch ms) captured at spawn, used to detect PID reuse. */
  helperCreatedAtMs?: number;
};

export type ProcessSnapshot = {
  pid: number;
  isRunning: boolean;
  processName: string | null;
};

const stateFilePath = join(environment.supportPath, "caffeine-state.json");
const windowsScriptPath = join(environment.supportPath, "windows-caffeine.ps1");
const windowsExecutionState = {
  continuous: 0x80000000,
  systemRequired: 0x00000001,
  displayRequired: 0x00000002,
};

function ensureSupportPath() {
  mkdirSync(environment.supportPath, { recursive: true });
}

function readStateFile(): RunningCaffeineState | null {
  try {
    if (!existsSync(stateFilePath)) {
      return null;
    }

    const rawState = readFileSync(stateFilePath, "utf8");
    return JSON.parse(rawState) as RunningCaffeineState;
  } catch {
    return null;
  }
}

function writeStateFile(state: RunningCaffeineState) {
  ensureSupportPath();
  writeFileSync(stateFilePath, JSON.stringify(state, null, 2), "utf8");
}

function clearStateFile() {
  if (existsSync(stateFilePath)) {
    unlinkSync(stateFilePath);
  }
}

function readTrackedState() {
  return readStateFile();
}

function isProcessRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    if (process.platform !== "win32") {
      return false;
    }

    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", `Get-Process -Id ${pid}`], {
      stdio: "ignore",
      windowsHide: true,
    });
    return result.status === 0;
  }
}

/**
 * Tolerance (ms) allowed between the recorded helper creation time and the live
 * process creation time. PID values get reused by the OS, so comparing creation
 * timestamps is how we avoid killing an unrelated process that happens to reuse
 * the tracked PID.
 */
const PROCESS_IDENTITY_TOLERANCE_MS = 15_000;

type ProcessIdentity = {
  name: string | null;
  createdAtMs: number | null;
};

function readProcessIdentity(pid: number): ProcessIdentity | null {
  try {
    if (process.platform === "win32") {
      const command = [
        `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue`,
        "if (-not $p) { exit 1 }",
        "ConvertTo-Json -InputObject @{ name = $p.ProcessName; createdMs = [DateTimeOffset]::new($p.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds() } -Compress",
      ].join("; ");

      const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
        encoding: "utf8",
        windowsHide: true,
      });

      if (result.status !== 0 || !result.stdout.trim()) {
        return null;
      }

      const parsed = JSON.parse(result.stdout) as { name?: string; createdMs?: number };
      return {
        name: parsed.name ?? null,
        createdAtMs:
          typeof parsed.createdMs === "number" && Number.isFinite(parsed.createdMs) ? parsed.createdMs : null,
      };
    }

    const result = spawnSync("ps", ["-p", String(pid), "-o", "etimes=,comm="], {
      encoding: "utf8",
    });

    if (result.status !== 0 || !result.stdout.trim()) {
      return null;
    }

    const trimmed = result.stdout.trim();
    const separatorIndex = trimmed.indexOf(" ");
    if (separatorIndex === -1) {
      return null;
    }

    const elapsedSeconds = Number.parseInt(trimmed.slice(0, separatorIndex), 10);
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      return null;
    }

    return {
      name: trimmed.slice(separatorIndex).trim() || null,
      createdAtMs: Date.now() - elapsedSeconds * 1000,
    };
  } catch {
    return null;
  }
}

function identityMatches(state: RunningCaffeineState, identity: ProcessIdentity | null) {
  if (!identity || identity.createdAtMs === null || state.helperCreatedAtMs === undefined) {
    // Without a recorded creation time we cannot prove the PID was reused, so we
    // fall back to the previous behavior instead of blocking legitimate stops.
    return true;
  }

  return Math.abs(identity.createdAtMs - state.helperCreatedAtMs) <= PROCESS_IDENTITY_TOLERANCE_MS;
}

function isTrackedProcessAlive(state: RunningCaffeineState) {
  if (!isProcessRunning(state.pid)) {
    return false;
  }

  return identityMatches(state, readProcessIdentity(state.pid));
}

function killTrackedProcess(pid: number) {
  try {
    process.kill(pid);
  } catch {
    if (process.platform === "win32") {
      spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    }
  }
}

function toPowerShellSingleQuoted(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function ensureWindowsScript() {
  ensureSupportPath();

  const scriptContents = [
    "param(",
    "  [Int64]$DurationMs = 0,",
    "  [switch]$KeepDisplayAwake",
    ")",
    "",
    "$ErrorActionPreference = 'Stop'",
    "",
    "Add-Type @'",
    "using System;",
    "using System.Runtime.InteropServices;",
    "public static class CaffeineNative {",
    '  [DllImport("kernel32.dll", SetLastError = true)]',
    "  public static extern uint SetThreadExecutionState(uint esFlags);",
    "}",
    "'@",
    "",
    `$ES_CONTINUOUS = ${windowsExecutionState.continuous}`,
    `$ES_SYSTEM_REQUIRED = ${windowsExecutionState.systemRequired}`,
    `$ES_DISPLAY_REQUIRED = ${windowsExecutionState.displayRequired}`,
    "",
    "$flags = $ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED",
    "if ($KeepDisplayAwake) {",
    "  $flags = $flags -bor $ES_DISPLAY_REQUIRED",
    "}",
    "",
    "$deadline = $null",
    "if ($DurationMs -gt 0) {",
    "  $deadline = [DateTime]::UtcNow.AddMilliseconds($DurationMs)",
    "}",
    "",
    "try {",
    "  while ($true) {",
    "    [CaffeineNative]::SetThreadExecutionState($flags) | Out-Null",
    "    if ($deadline -and [DateTime]::UtcNow -ge $deadline) {",
    "      break",
    "    }",
    "    Start-Sleep -Seconds 30",
    "  }",
    "} finally {",
    "  [CaffeineNative]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null",
    "}",
    "",
  ].join("\n");

  writeFileSync(windowsScriptPath, scriptContents, "utf8");
}

function startMacCaffeine(durationMs?: number, keepDisplayAwake = true): { pid: number; createdAtMs?: number } {
  const args = keepDisplayAwake ? ["-d", "-i"] : ["-i"];
  if (durationMs && durationMs > 0) {
    args.push("-t", String(Math.max(1, Math.ceil(durationMs / 1000))));
  }

  const child = spawn("caffeinate", args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  if (!child.pid) {
    throw new Error("Failed to launch macOS caffeine helper.");
  }

  // Record the helper's creation time so later PID-reuse can be detected.
  const identity = readProcessIdentity(child.pid);
  return { pid: child.pid, createdAtMs: identity?.createdAtMs ?? undefined };
}

function startWindowsCaffeine(durationMs?: number, keepDisplayAwake = true): { pid: number; createdAtMs?: number } {
  ensureWindowsScript();

  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", windowsScriptPath];
  if (durationMs && durationMs > 0) {
    args.push("-DurationMs", String(durationMs));
  }
  if (keepDisplayAwake) {
    args.push("-KeepDisplayAwake");
  }

  const argumentList = args.map(toPowerShellSingleQuoted).join(", ");
  const launchCommand = [
    "$process = Start-Process -FilePath 'powershell.exe'",
    `-ArgumentList @(${argumentList})`,
    "-WindowStyle Hidden",
    "-PassThru;",
    "ConvertTo-Json -InputObject @{ pid = $process.Id; createdMs = [DateTimeOffset]::new($process.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds() } -Compress",
  ].join(" ");

  const launchResult = spawnSync("powershell.exe", ["-NoProfile", "-Command", launchCommand], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (launchResult.status !== 0) {
    throw new Error(launchResult.stderr?.trim() || "Failed to launch Windows caffeine helper.");
  }

  let parsedLaunch: { pid?: unknown; createdMs?: unknown };
  try {
    parsedLaunch = JSON.parse(launchResult.stdout.trim());
  } catch {
    throw new Error(`Failed to read Windows caffeine helper PID: ${launchResult.stdout}`);
  }

  const pid = Number(parsedLaunch.pid);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`Failed to read Windows caffeine helper PID: ${launchResult.stdout}`);
  }

  // Record the helper's creation time so later PID-reuse can be detected.
  const createdAtMs = Number(parsedLaunch.createdMs);
  return { pid, createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : undefined };
}

export async function getRunningState() {
  const savedState = readStateFile();
  if (!savedState) {
    return null;
  }

  if (!isTrackedProcessAlive(savedState)) {
    clearStateFile();
    return null;
  }

  return savedState;
}

export function getProcessSnapshot(): ProcessSnapshot | null {
  const savedState = readTrackedState();
  if (!savedState) {
    return null;
  }

  if (process.platform === "win32") {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Get-Process -Id ${savedState.pid} | Select-Object -First 1 Id, ProcessName | ConvertTo-Json -Compress`,
      ],
      {
        encoding: "utf8",
        windowsHide: true,
      },
    );

    if (result.status !== 0 || !result.stdout.trim()) {
      return {
        pid: savedState.pid,
        isRunning: false,
        processName: null,
      };
    }

    try {
      const parsed = JSON.parse(result.stdout) as { Id: number; ProcessName: string };
      return {
        pid: parsed.Id,
        isRunning: true,
        processName: parsed.ProcessName,
      };
    } catch {
      return {
        pid: savedState.pid,
        isRunning: true,
        processName: null,
      };
    }
  }

  const running = isProcessRunning(savedState.pid);
  return {
    pid: savedState.pid,
    isRunning: running,
    processName: running ? "caffeinate" : null,
  };
}

export async function startCaffeine(options?: { durationMs?: number; keepDisplayAwake?: boolean }) {
  const existingState = await getRunningState();
  if (existingState) {
    await stopCaffeine();
  }

  const durationMs = options?.durationMs;
  const keepDisplayAwake = options?.keepDisplayAwake ?? true;
  const helper =
    process.platform === "darwin"
      ? startMacCaffeine(durationMs, keepDisplayAwake)
      : process.platform === "win32"
        ? startWindowsCaffeine(durationMs, keepDisplayAwake)
        : null;

  if (!helper) {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  const state: RunningCaffeineState = {
    pid: helper.pid,
    keepDisplayAwake,
    mode: durationMs && durationMs > 0 ? "timed" : "indefinite",
    startedAt: new Date().toISOString(),
    endsAt: durationMs && durationMs > 0 ? new Date(Date.now() + durationMs).toISOString() : undefined,
    helperCreatedAtMs: helper.createdAtMs,
  };

  writeStateFile(state);
  return state;
}

export async function stopCaffeine() {
  const savedState = readStateFile();
  if (!savedState) {
    return false;
  }

  // Only terminate the process when it is still the one we spawned. If the PID
  // was recycled by another process, leave it alone and just forget the state.
  if (isTrackedProcessAlive(savedState)) {
    killTrackedProcess(savedState.pid);
  }

  clearStateFile();
  return true;
}

export async function resetCaffeineState() {
  const snapshot = getProcessSnapshot();
  const savedState = readTrackedState();

  if (snapshot?.isRunning && savedState && identityMatches(savedState, readProcessIdentity(snapshot.pid))) {
    killTrackedProcess(snapshot.pid);
  }

  clearStateFile();
}

export function formatStateSubtitle(state: RunningCaffeineState | null) {
  if (!state) {
    return "Your system can sleep normally.";
  }

  if (state.mode === "indefinite") {
    return state.keepDisplayAwake ? "Keeping the system and display awake." : "Keeping the system awake.";
  }

  if (!state.endsAt) {
    return "Keeping the system awake until the timer expires.";
  }

  const endTime = new Date(state.endsAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return state.keepDisplayAwake
    ? `Keeping the system and display awake until ${endTime}.`
    : `Keeping the system awake until ${endTime}.`;
}
