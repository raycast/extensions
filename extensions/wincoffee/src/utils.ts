import {
  getPreferenceValues,
  LocalStorage,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { exec, spawnSync } from "node:child_process";
import { promisify } from "node:util";

// No-op for production
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function logDebug(_msg: string): void {}

const execAsync = promisify(exec);
const LID_RESTORE_STARTING_KEY = "caffeinate_lid_restore_starting_at";
const STARTUP_RESTORE_GRACE_MS = 30_000;

export interface CaffeinateState {
  active: boolean;
  mode?: "indefinite" | "duration" | "process";
  startTime?: number;
  value?: string; // duration in seconds or process name
  remainingSeconds?: number;
}

export interface LidSleepState {
  supported: boolean;
  acSleepDisabled?: boolean; // true if 0 (do nothing), false if 1 (sleep)
  dcSleepDisabled?: boolean; // true if 0 (do nothing), false if 1 (sleep)
  acValue?: number;
  dcValue?: number;
}

type WinCoffeePreferences = Preferences & {
  keepScreenAlive?: boolean;
  keepDisplayAwake?: boolean;
};

// Update the caffeinate command subtitle inline status
export async function updateMetadata(caffeinated: boolean): Promise<void> {
  try {
    await launchCommand({
      name: "status",
      type: LaunchType.Background,
      context: { caffeinated },
    });
  } catch {
    // Ignore errors when launching command from background or non-loaded states
  }
}

// Check if a process PID is currently running using native tasklist (reliable across Node process boundaries)
async function isPidRunning(pid: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `tasklist /FI "PID eq ${pid}" /NH /FO CSV`,
    );
    const stdoutLower = stdout.toLowerCase();
    const running =
      stdoutLower.includes("powershell.exe") && stdout.includes(`"${pid}"`);
    logDebug(`isPidRunning(${pid}) -> ${running} (stdout: ${stdout.trim()})`);
    return running;
  } catch (err) {
    logDebug(
      `isPidRunning(${pid}) error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

async function stopPid(pid: number): Promise<void> {
  let taskkillError: unknown;
  try {
    logDebug(`Executing taskkill for PID ${pid}`);
    await execAsync(`taskkill /F /T /PID ${pid}`);
  } catch (err) {
    taskkillError = err;
    logDebug(
      `taskkill error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (await isPidRunning(pid)) {
    throw new Error(
      `Failed to stop caffeinate process ${pid}${taskkillError instanceof Error ? `: ${taskkillError.message}` : ""}`,
    );
  }
}

async function clearOriginalLidSettings(): Promise<void> {
  await Promise.all([
    LocalStorage.removeItem("original_ac_value"),
    LocalStorage.removeItem("original_dc_value"),
  ]);
}

async function isCaffeinateStartupInProgress(): Promise<boolean> {
  const startingAtStr = await LocalStorage.getItem<string>(
    LID_RESTORE_STARTING_KEY,
  );
  if (startingAtStr === undefined) {
    return false;
  }

  const startingAt = parseInt(startingAtStr, 10);
  if (
    !isNaN(startingAt) &&
    Date.now() - startingAt < STARTUP_RESTORE_GRACE_MS
  ) {
    return true;
  }

  await LocalStorage.removeItem(LID_RESTORE_STARTING_KEY);
  return false;
}

async function restoreOriginalLidSettings(reason: string): Promise<void> {
  const [origAcStr, origDcStr] = await Promise.all([
    LocalStorage.getItem<string>("original_ac_value"),
    LocalStorage.getItem<string>("original_dc_value"),
  ]);

  if (origAcStr === undefined && origDcStr === undefined) {
    return;
  }

  if (origAcStr === undefined || origDcStr === undefined) {
    logDebug(
      `Skipping lid restore (${reason}): original values are incomplete`,
    );
    return;
  }

  const origAc = parseInt(origAcStr, 10);
  const origDc = parseInt(origDcStr, 10);
  if (isNaN(origAc) || isNaN(origDc)) {
    logDebug(`Skipping lid restore (${reason}): original values are invalid`);
    return;
  }

  try {
    logDebug(`Restoring lid settings (${reason}): AC=${origAc}, DC=${origDc}`);
    await setRawLidSleepState(origAc, origDc);
    await clearOriginalLidSettings();
  } catch (err) {
    logDebug(
      `Lid sleep restore error (${reason}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// Get the current caffeinate state, cleaning up if the process died
export async function getCaffeinateState(): Promise<CaffeinateState> {
  logDebug("getCaffeinateState called");
  const [status, pidStr, mode, startTimeStr, value] = await Promise.all([
    LocalStorage.getItem<string>("caffeinate_status"),
    LocalStorage.getItem<string>("caffeinate_pid"),
    LocalStorage.getItem<string>("caffeinate_mode"),
    LocalStorage.getItem<string>("caffeinate_startTime"),
    LocalStorage.getItem<string>("caffeinate_value"),
  ]);

  logDebug(
    `LocalStorage: status=${status}, pidStr=${pidStr}, mode=${mode}, startTimeStr=${startTimeStr}, value=${value}`,
  );

  if (status !== "active" || !pidStr) {
    const startupInProgress = await isCaffeinateStartupInProgress();
    if (!startupInProgress && (status === "active" || pidStr)) {
      logDebug("State inconsistent, clearing state");
      await clearLocalStorageState();
    }

    if (!startupInProgress) {
      // Restore lid sleep settings if they were modified but not cleaned up (e.g. after restart)
      await restoreOriginalLidSettings("orphaned state");
    }

    return { active: false };
  }

  const pid = parseInt(pidStr, 10);
  if (isNaN(pid) || !(await isPidRunning(pid))) {
    logDebug(`Process ${pidStr} is dead or invalid PID, cleaning up`);
    await clearLocalStorageState();
    await updateMetadata(false);

    // Restore lid sleep settings if they were modified
    await restoreOriginalLidSettings("dead caffeinate process");

    return { active: false };
  }

  const startTime = startTimeStr ? parseInt(startTimeStr, 10) : undefined;
  let remainingSeconds: number | undefined;

  if (mode === "duration" && startTime && value) {
    const durationSeconds = parseInt(value, 10);
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);

    // If the timer should have expired but process is somehow still alive, handle it
    if (remainingSeconds === 0) {
      await stopCaffeinate();
      return { active: false };
    }
  }

  return {
    active: true,
    mode: mode as CaffeinateState["mode"],
    startTime,
    value,
    remainingSeconds,
  };
}

// Clear state from local storage in parallel
async function clearLocalStorageState() {
  await Promise.all([
    LocalStorage.removeItem("caffeinate_status"),
    LocalStorage.removeItem("caffeinate_pid"),
    LocalStorage.removeItem("caffeinate_mode"),
    LocalStorage.removeItem("caffeinate_startTime"),
    LocalStorage.removeItem("caffeinate_value"),
  ]);
}

// Spawn a detached PowerShell process using Start-Process with -EncodedCommand.
// Node.js spawn() with detached:true does NOT keep PowerShell alive on Windows —
// the process exits immediately. Using PowerShell's own Start-Process creates a
// truly independent background process that survives the parent exiting.
function spawnDetachedPowerShell(psScript: string): number {
  logDebug("spawnDetachedPowerShell called");
  const buffer = Buffer.from(psScript, "utf-16le");
  const base64 = buffer.toString("base64");
  const psCommand = `$p = Start-Process powershell.exe -ArgumentList '-NoProfile','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-EncodedCommand','${base64}' -PassThru -WindowStyle Hidden; Write-Output $p.Id`;

  logDebug(
    `Executing powershell.exe with launcher Command length: ${psCommand.length}`,
  );
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", psCommand],
    { encoding: "utf-8", windowsHide: true, timeout: 15000 },
  );

  if (result.error) {
    logDebug(`spawnSync error: ${result.error.message}`);
    throw result.error;
  }

  logDebug(
    `spawnSync finished. Stdout: ${result.stdout.trim()}, Stderr: ${result.stderr}`,
  );

  const pid = parseInt(result.stdout.trim(), 10);
  if (isNaN(pid)) {
    throw new Error(
      `Failed to get PID from Start-Process. Stdout: ${result.stdout}. Stderr: ${result.stderr}`,
    );
  }
  return pid;
}

// Start caffeinate with a specific mode
export async function startCaffeinate(
  mode: "indefinite" | "duration" | "process",
  value?: number | string,
): Promise<void> {
  // Always stop existing first
  await stopCaffeinate(false);

  const prefs = getPreferenceValues<WinCoffeePreferences>();
  const keepScreenAlive =
    prefs.keepScreenAlive ?? prefs.keepDisplayAwake ?? true;
  const ignoreLid = prefs.ignoreLidWhileCaffeinated ?? false;
  let lidStartupGuard = false;

  if (ignoreLid) {
    try {
      await LocalStorage.setItem(
        LID_RESTORE_STARTING_KEY,
        Date.now().toString(),
      );
      lidStartupGuard = true;

      const lidState = await getLidSleepState();
      if (
        lidState.supported &&
        lidState.acValue !== undefined &&
        lidState.dcValue !== undefined
      ) {
        // Save original settings if they aren't already saved
        const existingAc =
          await LocalStorage.getItem<string>("original_ac_value");
        const existingDc =
          await LocalStorage.getItem<string>("original_dc_value");
        if (existingAc === undefined || existingDc === undefined) {
          await Promise.all([
            LocalStorage.setItem(
              "original_ac_value",
              lidState.acValue.toString(),
            ),
            LocalStorage.setItem(
              "original_dc_value",
              lidState.dcValue.toString(),
            ),
          ]);
        }
        // Set both AC and DC to 0 (Do Nothing)
        await setLidSleepState(true, true);
      }
    } catch {
      // Ignore errors if lid settings cannot be read/set
    }
  }

  // Win32 Flags:
  // ES_CONTINUOUS = 0x80000000
  // ES_SYSTEM_REQUIRED = 0x00000001
  // ES_DISPLAY_REQUIRED = 0x00000002
  const flags = keepScreenAlive ? "0x80000003" : "0x80000001";
  // ES_CONTINUOUS only — clears all other flags
  const clearFlags = "0x80000000";

  let psCommand = "";

  const baseScript = `
<# WinCoffee_Caffeinate #>
$dq = [char]34
$code = 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(' + $dq + 'kernel32.dll' + $dq + ') ] public static extern uint SetThreadExecutionState(int f); }'
Add-Type -TypeDefinition $code
`.trim();

  if (mode === "indefinite") {
    psCommand = `${baseScript}
try {
  while ($true) {
    [Win32]::SetThreadExecutionState(${flags}) | Out-Null
    Start-Sleep -Seconds 60
  }
} finally {
  [Win32]::SetThreadExecutionState(${clearFlags}) | Out-Null
}
`;
  } else if (mode === "duration" && typeof value === "number") {
    psCommand = `${baseScript}
$endTime = (Get-Date).AddSeconds(${value})
try {
  while ((Get-Date) -lt $endTime) {
    [Win32]::SetThreadExecutionState(${flags}) | Out-Null
    $remaining = ($endTime - (Get-Date)).TotalSeconds
    $sleepTime = [Math]::Min(60, [Math]::Max(1, $remaining))
    Start-Sleep -Seconds $sleepTime
  }
} finally {
  [Win32]::SetThreadExecutionState(${clearFlags}) | Out-Null
}
`;
  } else if (mode === "process" && typeof value === "string") {
    const escapedProcessName = value.replace(/'/g, "''");
    psCommand = `${baseScript}
try {
  while (Get-Process -Name '${escapedProcessName}' -ErrorAction SilentlyContinue | Where-Object MainWindowTitle) {
    [Win32]::SetThreadExecutionState(${flags}) | Out-Null
    Start-Sleep -Seconds 10
  }
} finally {
  [Win32]::SetThreadExecutionState(${clearFlags}) | Out-Null
}
`;
  } else {
    throw new Error("Invalid parameters for startCaffeinate");
  }

  logDebug(`Spawning background script...`);
  try {
    const pid = spawnDetachedPowerShell(psCommand);
    logDebug(`Spawned process successfully. PID: ${pid}`);

    const stateWrites = [
      LocalStorage.setItem("caffeinate_pid", pid.toString()),
      LocalStorage.setItem("caffeinate_mode", mode),
      LocalStorage.setItem("caffeinate_startTime", Date.now().toString()),
    ];
    if (value !== undefined) {
      stateWrites.push(
        LocalStorage.setItem("caffeinate_value", value.toString()),
      );
    }
    await Promise.all(stateWrites);
    await LocalStorage.setItem("caffeinate_status", "active");
    await LocalStorage.removeItem(LID_RESTORE_STARTING_KEY);
    logDebug("LocalStorage state saved successfully");
    await updateMetadata(true);
  } catch (err) {
    logDebug(
      `spawnDetachedPowerShell failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    if (lidStartupGuard) {
      await restoreOriginalLidSettings("failed caffeinate start");
      await LocalStorage.removeItem(LID_RESTORE_STARTING_KEY);
    }
    throw err;
  }
}

// Stop current caffeinate process
export async function stopCaffeinate(runOrphanKiller = true): Promise<void> {
  logDebug(`stopCaffeinate called with runOrphanKiller=${runOrphanKiller}`);
  const pidStr = await LocalStorage.getItem<string>("caffeinate_pid");
  let activePid: number | undefined;
  let wasRunning = false;

  if (pidStr) {
    const pid = parseInt(pidStr, 10);
    if (!isNaN(pid)) {
      activePid = pid;
      wasRunning = await isPidRunning(pid);
      logDebug(`stopCaffeinate: PID=${pid}, wasRunning=${wasRunning}`);
      if (wasRunning) {
        await stopPid(pid);
      }
    }
  }

  logDebug("Clearing LocalStorage state...");
  await clearLocalStorageState();
  await updateMetadata(false);

  // Restore lid sleep settings if they were modified
  await restoreOriginalLidSettings("stop caffeinate");
  await LocalStorage.removeItem(LID_RESTORE_STARTING_KEY);

  // Safely clean up orphaned processes in the background (only if requested and the process was actively running)
  if (runOrphanKiller && wasRunning) {
    setTimeout(async () => {
      try {
        const latestPidStr =
          await LocalStorage.getItem<string>("caffeinate_pid");
        const latestPid = latestPidStr ? parseInt(latestPidStr, 10) : undefined;

        const excludePids = [process.pid]; // Exclude current node process
        if (latestPid && !isNaN(latestPid)) {
          excludePids.push(latestPid);
        }
        if (activePid) {
          excludePids.push(activePid);
        }

        const excludeFilter = excludePids
          .map((p) => `$_.ProcessId -ne ${p}`)
          .join(" -and ");

        // Find powershell processes running the WinCoffee encoded command and stop them
        const psScript = `Get-CimInstance Win32_Process -Filter "name = 'powershell.exe'" | ForEach-Object { if ($_.CommandLine -match '-EncodedCommand\\s+(\\S+)') { $b64 = $matches[1]; try { $bytes = [System.Convert]::FromBase64String($b64); $decoded = [System.Text.Encoding]::Unicode.GetString($bytes); if ($decoded -like '*WinCoffee_Caffeinate*' -and ${excludeFilter}) { Stop-Process -Id $_.ProcessId -Force } } catch {} } }`;
        const base64 = Buffer.from(psScript, "utf-16le").toString("base64");
        exec(
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64}`,
        );
      } catch {
        // Ignore background cleanup errors
      }
    }, 100);
  }
}

// Get the current lid sleep configuration via async Registry queries
export async function getLidSleepState(): Promise<LidSleepState> {
  try {
    // Query active power scheme GUID from registry using reg query (much faster than powershell)
    const { stdout: activeSchemeOut } = await execAsync(
      `reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\User\\PowerSchemes" /v ActivePowerScheme`,
    );
    const activeMatch = activeSchemeOut.match(
      /ActivePowerScheme\s+REG_SZ\s+(\S+)/i,
    );
    if (!activeMatch) {
      return { supported: false };
    }
    const activeScheme = activeMatch[1];

    // Query lid close action configuration for active power scheme
    const regPath = `HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\User\\PowerSchemes\\${activeScheme}\\4f971e89-eebd-4455-a8de-9e59040e7347\\5ca83367-6e45-459f-a27b-476b1d01c936`;
    const { stdout: output } = await execAsync(`reg query "${regPath}"`);

    const acMatch = output.match(/ACSettingIndex\s+REG_DWORD\s+(\S+)/i);
    const dcMatch = output.match(/DCSettingIndex\s+REG_DWORD\s+(\S+)/i);

    if (!acMatch || !dcMatch) {
      return { supported: false };
    }

    const acValue = parseInt(acMatch[1], 16);
    const dcValue = parseInt(dcMatch[1], 16);

    return {
      supported: true,
      acSleepDisabled: acValue === 0,
      dcSleepDisabled: dcValue === 0,
      acValue,
      dcValue,
    };
  } catch {
    // If commands fail (e.g. on desktops where lid settings do not exist), return unsupported
    return { supported: false };
  }
}

// Set the lid sleep configuration index values directly
export async function setRawLidSleepState(
  acVal: number,
  dcVal: number,
): Promise<void> {
  const currentState = await getLidSleepState();
  const rollbackAc = currentState.supported ? currentState.acValue : undefined;
  const rollbackDc = currentState.supported ? currentState.dcValue : undefined;

  let acChanged = false;
  let dcChanged = false;

  try {
    await execAsync(
      `powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION ${acVal}`,
    );
    acChanged = true;

    await execAsync(
      `powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION ${dcVal}`,
    );
    dcChanged = true;

    await execAsync(`powercfg /setactive SCHEME_CURRENT`);
  } catch (err) {
    logDebug(
      `setRawLidSleepState failed: ${err instanceof Error ? err.message : String(err)}. Attempting rollback...`,
    );
    try {
      if (acChanged && rollbackAc !== undefined) {
        await execAsync(
          `powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION ${rollbackAc}`,
        );
      }
      if (dcChanged && rollbackDc !== undefined) {
        await execAsync(
          `powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION ${rollbackDc}`,
        );
      }
      if (acChanged || dcChanged) {
        await execAsync(`powercfg /setactive SCHEME_CURRENT`);
      }
    } catch (rollbackErr) {
      logDebug(
        `Rollback failed: ${rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)}`,
      );
    }

    throw new Error(
      `Failed to change lid sleep settings: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// Set the lid sleep configuration asynchronously
export async function setLidSleepState(
  acDisable: boolean,
  dcDisable: boolean,
): Promise<void> {
  const acVal = acDisable ? 0 : 1;
  const dcVal = dcDisable ? 0 : 1;
  await setRawLidSleepState(acVal, dcVal);
}
