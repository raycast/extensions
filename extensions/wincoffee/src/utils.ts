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

interface Preferences {
  keepDisplayAwake: boolean;
  ignoreLidWhileCaffeinated: boolean;
}

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
    if (status === "active" || pidStr) {
      logDebug("State inconsistent, clearing state");
      await clearLocalStorageState();
    }
    return { active: false };
  }

  const pid = parseInt(pidStr, 10);
  if (isNaN(pid) || !(await isPidRunning(pid))) {
    logDebug(`Process ${pidStr} is dead or invalid PID, cleaning up`);
    await clearLocalStorageState();
    await updateMetadata(false);

    // Restore lid sleep settings if they were modified
    try {
      const [origAcStr, origDcStr] = await Promise.all([
        LocalStorage.getItem<string>("original_ac_value"),
        LocalStorage.getItem<string>("original_dc_value"),
      ]);
      if (origAcStr !== undefined && origDcStr !== undefined) {
        const origAc = parseInt(origAcStr, 10);
        const origDc = parseInt(origDcStr, 10);
        if (!isNaN(origAc) && !isNaN(origDc)) {
          logDebug(
            `Restoring original lid settings: AC=${origAc}, DC=${origDc}`,
          );
          await setRawLidSleepState(origAc, origDc);
        }
      }
    } catch (err) {
      logDebug(
        `Lid sleep restore error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      await LocalStorage.removeItem("original_ac_value");
      await LocalStorage.removeItem("original_dc_value");
    }

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
  await LocalStorage.removeItem("caffeinate_status");
  await LocalStorage.removeItem("caffeinate_pid");
  await LocalStorage.removeItem("caffeinate_mode");
  await LocalStorage.removeItem("caffeinate_startTime");
  await LocalStorage.removeItem("caffeinate_value");
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

  const prefs = getPreferenceValues<Preferences>();
  const keepDisplayAwake = prefs.keepDisplayAwake ?? true;
  const ignoreLid = prefs.ignoreLidWhileCaffeinated ?? false;

  if (ignoreLid) {
    try {
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
  const flags = keepDisplayAwake ? "0x80000003" : "0x80000001";
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
  while (Get-Process -Name '${escapedProcessName}' -ErrorAction SilentlyContinue) {
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

    await LocalStorage.setItem("caffeinate_status", "active");
    await LocalStorage.setItem("caffeinate_pid", pid.toString());
    await LocalStorage.setItem("caffeinate_mode", mode);
    await LocalStorage.setItem("caffeinate_startTime", Date.now().toString());
    if (value !== undefined) {
      await LocalStorage.setItem("caffeinate_value", value.toString());
    }
    logDebug("LocalStorage state saved successfully");
    await updateMetadata(true);
  } catch (err) {
    logDebug(
      `spawnDetachedPowerShell failed: ${err instanceof Error ? err.message : String(err)}`,
    );
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
        try {
          logDebug(`Executing taskkill for PID ${pid}`);
          exec(`taskkill /F /T /PID ${pid}`);
        } catch (err) {
          logDebug(
            `taskkill error: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  logDebug("Clearing LocalStorage state...");
  await clearLocalStorageState();
  await updateMetadata(false);

  // Restore lid sleep settings if they were modified
  try {
    const [origAcStr, origDcStr] = await Promise.all([
      LocalStorage.getItem<string>("original_ac_value"),
      LocalStorage.getItem<string>("original_dc_value"),
    ]);
    if (origAcStr !== undefined && origDcStr !== undefined) {
      const origAc = parseInt(origAcStr, 10);
      const origDc = parseInt(origDcStr, 10);
      if (!isNaN(origAc) && !isNaN(origDc)) {
        await setRawLidSleepState(origAc, origDc);
      }
    }
  } catch {
    // Ignore errors during restore
  } finally {
    await LocalStorage.removeItem("original_ac_value");
    await LocalStorage.removeItem("original_dc_value");
  }

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
        const psCmd = `Get-CimInstance Win32_Process -Filter "name = 'powershell.exe'" | ForEach-Object { if ($_.CommandLine -match '-EncodedCommand\\s+(\\S+)') { $b64 = $matches[1]; try { $bytes = [System.Convert]::FromBase64String($b64); $decoded = [System.Text.Encoding]::Unicode.GetString($bytes); if ($decoded -like '*WinCoffee_Caffeinate*' -and ${excludeFilter}) { Stop-Process -Id $_.ProcessId -Force } } catch {} } }`;
        exec(
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCmd}"`,
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
  try {
    await execAsync(
      `powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION ${acVal}`,
    );
    await execAsync(
      `powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION ${dcVal}`,
    );
    await execAsync(`powercfg /setactive SCHEME_CURRENT`);
  } catch (err) {
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
