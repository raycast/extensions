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

function startMacCaffeine(durationMs?: number, keepDisplayAwake = true) {
  const args = keepDisplayAwake ? ["-d", "-i"] : ["-i"];
  if (durationMs && durationMs > 0) {
    args.push("-t", String(Math.max(1, Math.ceil(durationMs / 1000))));
  }

  const child = spawn("caffeinate", args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return child.pid;
}

function startWindowsCaffeine(durationMs?: number, keepDisplayAwake = true) {
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
    "$process.Id",
  ].join(" ");

  const launchResult = spawnSync("powershell.exe", ["-NoProfile", "-Command", launchCommand], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (launchResult.status !== 0) {
    throw new Error(launchResult.stderr?.trim() || "Failed to launch Windows caffeine helper.");
  }

  const pid = Number.parseInt(launchResult.stdout.trim(), 10);
  if (!Number.isFinite(pid)) {
    throw new Error(`Failed to read Windows caffeine helper PID: ${launchResult.stdout}`);
  }

  return pid;
}

export async function getRunningState() {
  const savedState = readStateFile();
  if (!savedState) {
    return null;
  }

  if (!isProcessRunning(savedState.pid)) {
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
  const pid =
    process.platform === "darwin"
      ? startMacCaffeine(durationMs, keepDisplayAwake)
      : process.platform === "win32"
        ? startWindowsCaffeine(durationMs, keepDisplayAwake)
        : null;

  if (!pid) {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  const state: RunningCaffeineState = {
    pid,
    keepDisplayAwake,
    mode: durationMs && durationMs > 0 ? "timed" : "indefinite",
    startedAt: new Date().toISOString(),
    endsAt: durationMs && durationMs > 0 ? new Date(Date.now() + durationMs).toISOString() : undefined,
  };

  writeStateFile(state);
  return state;
}

export async function stopCaffeine() {
  const savedState = readStateFile();
  if (!savedState) {
    return false;
  }

  try {
    process.kill(savedState.pid);
  } catch {
    if (process.platform === "win32") {
      spawnSync("taskkill.exe", ["/PID", String(savedState.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    }
  }

  clearStateFile();
  return true;
}

export async function resetCaffeineState() {
  const snapshot = getProcessSnapshot();
  if (snapshot?.isRunning) {
    try {
      process.kill(snapshot.pid);
    } catch {
      if (process.platform === "win32") {
        spawnSync("taskkill.exe", ["/PID", String(snapshot.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
      }
    }
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
