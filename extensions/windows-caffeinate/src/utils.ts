import { getPreferenceValues, launchCommand, LaunchType, LocalStorage, environment, showHUD } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";
import * as fs from "node:fs";
import * as path from "node:path";
import { Schedule, CaffeinationInfo } from "./interfaces";

export type { Schedule, CaffeinationInfo };

const HELPER_FILE_NAME = "caffeinate-helper.ps1";

// The marker every query/kill script matches on. It doubles as the helper's
// own filename so `Get-CimInstance ... -like '*<marker>*'` on CommandLine
// finds exactly the processes we spawned, the same way the Mac version uses
// `pgrep caffeinate` / `killall caffeinate` to find its own child processes.
const PROCESS_MARKER = HELPER_FILE_NAME;

// Windows has no per-thread "prevent disk sleep" primitive like macOS's
// `caffeinate -m`, so that preference has no equivalent here and was dropped.
const HELPER_SCRIPT = `param(
    [int]$DurationSeconds = 0,
    [switch]$PreventDisplay,
    [switch]$PreventSystem,
    [int]$WatchPid = 0
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RaycastCaffeinate {
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);
}
"@

$ES_CONTINUOUS = [uint32]0x80000000
$ES_SYSTEM_REQUIRED = [uint32]0x00000001
$ES_DISPLAY_REQUIRED = [uint32]0x00000002

$flags = $ES_CONTINUOUS
if ($PreventSystem) { $flags = $flags -bor $ES_SYSTEM_REQUIRED }
if ($PreventDisplay) { $flags = $flags -bor $ES_DISPLAY_REQUIRED }

$endTime = $null
if ($DurationSeconds -gt 0) { $endTime = (Get-Date).AddSeconds($DurationSeconds) }

while ($true) {
    [RaycastCaffeinate]::SetThreadExecutionState($flags) | Out-Null

    if ($endTime -ne $null -and (Get-Date) -ge $endTime) { break }
    if ($WatchPid -gt 0) {
        $watched = Get-Process -Id $WatchPid -ErrorAction SilentlyContinue
        if (-not $watched) { break }
    }

    Start-Sleep -Seconds 5
}

[RaycastCaffeinate]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
`;

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function helperPath(): string {
  return path.join(environment.supportPath, HELPER_FILE_NAME);
}

function ensureHelperScript(): string {
  const targetPath = helperPath();
  fs.mkdirSync(environment.supportPath, { recursive: true });
  fs.writeFileSync(targetPath, HELPER_SCRIPT, "utf8");
  return targetPath;
}

type Updates = {
  status: boolean;
};

export async function startCaffeinate(
  updates: Updates,
  hudMessage?: string,
  opts?: { durationSeconds?: number; watchPid?: number },
) {
  // Do the actual work before announcing success — showing the HUD first
  // (as the Mac version does) would lie to the user if the launch below
  // fails partway through.
  await killHelperProcesses();

  const preferences = getPreferenceValues<Preferences>();
  const scriptPath = ensureHelperScript();
  const durationSeconds = opts?.durationSeconds ?? 0;
  const watchPid = opts?.watchPid ?? 0;

  // Every element must be a quoted PowerShell string literal here — this
  // builds a `@(...)` array literal, not a native PowerShell command line,
  // so bare tokens like -NoProfile would fail to parse.
  const helperArgs = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    "-DurationSeconds",
    String(durationSeconds),
    "-WatchPid",
    String(watchPid),
  ];
  if (preferences.preventDisplay) {
    helperArgs.push("-PreventDisplay");
  }
  if (preferences.preventSystem) {
    helperArgs.push("-PreventSystem");
  }

  const launcherScript = `Start-Process -WindowStyle Hidden -FilePath 'powershell.exe' -ArgumentList @(${helperArgs.map(psQuote).join(", ")}) | Out-Null`;

  await runPowerShellScript(launcherScript, { timeout: 8000 });
  await update(updates, true);

  if (hudMessage) {
    await showHUD(hudMessage);
  }
}

export async function stopCaffeinate(updates: Updates, hudMessage?: string) {
  await killHelperProcesses();
  await update(updates, false);

  if (hudMessage) {
    await showHUD(hudMessage);
  }
}

async function killHelperProcesses() {
  const script = `Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object { $_.CommandLine -match '-File\\s+.*${PROCESS_MARKER}' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  await runPowerShellScript(script, { timeout: 8000 });
}

async function update(updates: Updates, caffeinated: boolean) {
  if (updates.status) {
    await tryLaunchCommand("status", { caffeinated });
  }
}

async function tryLaunchCommand(commandName: string, context: { caffeinated: boolean }) {
  try {
    await launchCommand({ name: commandName, type: LaunchType.Background, context });
  } catch {
    // Command might not be enabled
  }
}

export async function isCaffeinateRunning(): Promise<boolean> {
  const script = `$m = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object { $_.CommandLine -match '-File\\s+.*${PROCESS_MARKER}' }\nif ($m) { Write-Output '1' } else { Write-Output '0' }`;
  const output = await runPowerShellScript(script, { timeout: 8000 });
  return output.trim() === "1";
}

export async function getCaffeinationInfo(): Promise<CaffeinationInfo> {
  const script = `$procs = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object { $_.CommandLine -match '-File\\s+.*${PROCESS_MARKER}' }
$m = $procs | Select-Object -First 1
if ($m) {
  $duration = $null
  if ($m.CommandLine -match '-DurationSeconds\\s+(\\d+)') { $duration = [int]$Matches[1]; if ($duration -eq 0) { $duration = $null } }
  $watch = $null
  if ($m.CommandLine -match '-WatchPid\\s+(\\d+)') { $watch = [int]$Matches[1]; if ($watch -eq 0) { $watch = $null } }
  $elapsed = [int]((Get-Date) - $m.CreationDate).TotalSeconds
  [PSCustomObject]@{ running = $true; totalSeconds = $duration; elapsedSeconds = $elapsed; watchPid = $watch } | ConvertTo-Json -Compress
} else {
  [PSCustomObject]@{ running = $false; totalSeconds = $null; elapsedSeconds = $null; watchPid = $null } | ConvertTo-Json -Compress
}`;

  // runPowerShellScript's return type is always Promise<string> regardless of
  // `parseOutput` (unlike useExec/runAppleScript, which propagate the generic) —
  // so parse the JSON ourselves after getting the raw string back.
  const stdout = await runPowerShellScript(script, { timeout: 8000 });
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { running: false, totalSeconds: null, elapsedSeconds: null, watchPid: null };
  }
  return JSON.parse(trimmed) as CaffeinationInfo;
}

export interface RunningApp {
  name: string;
  pid: number;
}

export async function getRunningApps(): Promise<RunningApp[]> {
  // Mirrors the Mac version's "every process whose background only is false":
  // list processes that own a visible top-level window.
  const script =
    "Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | " +
    "Select-Object @{Name='name';Expression={$_.MainWindowTitle}}, @{Name='pid';Expression={$_.Id}} | " +
    "ConvertTo-Json -Compress";

  const stdout = await runPowerShellScript(script, { timeout: 8000 });
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function numberToDayString(dayIndex: number): string {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return daysOfWeek[dayIndex];
}

export async function getSchedule() {
  const currentDate = new Date();
  const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();

  const storedSchedule: string | undefined = await LocalStorage.getItem(currentDayString);
  if (storedSchedule === undefined) return undefined;

  const schedule: Schedule = JSON.parse(storedSchedule);
  return schedule;
}

export async function changeScheduleState(operation: string, schedule: Schedule) {
  switch (operation) {
    case "caffeinate": {
      schedule.IsManuallyDecafed = false;
      schedule.IsRunning = false;
      await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
      break;
    }
    case "decaffeinate": {
      if (schedule.IsRunning === true || isNotTodaysSchedule(schedule)) {
        schedule.IsManuallyDecafed = true;
        schedule.IsRunning = false;
        await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
      }
      break;
    }

    default:
      break;
  }
}

export function isTodaysSchedule(schedule: Schedule) {
  const currentDate = new Date();
  const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();

  return schedule.day === currentDayString;
}

export function isNotTodaysSchedule(schedule: Schedule) {
  return !isTodaysSchedule(schedule);
}

/*
Example usage:
console.log(formatDuration(1337000)); // Output: "15d 11h 23m 20s"
console.log(formatDuration(3600));    // Output: "1h"
console.log(formatDuration(65));      // Output: "1m 5s"
console.log(formatDuration(86400));   // Output: "1d"
*/
export function formatDuration(seconds: number): string {
  const units = [
    { label: "d", value: 86400 },
    { label: "h", value: 3600 },
    { label: "m", value: 60 },
    { label: "s", value: 1 },
  ];

  const result: string[] = [];

  for (const unit of units) {
    const amount = Math.floor(seconds / unit.value);
    seconds %= unit.value;
    if (amount > 0) {
      result.push(`${amount}${unit.label}`);
    }
  }

  return result.join(" ");
}
