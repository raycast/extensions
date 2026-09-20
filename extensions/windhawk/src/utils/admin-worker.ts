import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

export const TASK_NAME = "RaycastWindhawkAdminWorker";

// Raycast's extension host overrides LOCALAPPDATA and USERPROFILE to a temp
// sandbox that gets wiped by temp cleaners and differs from the real profile
// outside Raycast. The registry "Shell Folders" key stores fully expanded
// paths, so it resolves the real LocalAppData regardless of env overrides.
function resolveRealLocalAppData(): string | undefined {
  try {
    const stdout = execFileSync(
      "reg.exe",
      ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders", "/v", "Local AppData"],
      { encoding: "utf-8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] },
    );
    for (const line of stdout.split(/\r?\n/)) {
      if (!line.includes("Local AppData")) continue;
      const idx = line.indexOf("REG_SZ");
      if (idx === -1) continue;
      const value = line.slice(idx + "REG_SZ".length).trim();
      if (value && !value.includes("%")) return value;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

const WORK_DIR = join(
  resolveRealLocalAppData() || process.env.USERPROFILE || process.env.LOCALAPPDATA || tmpdir(),
  "RaycastWindhawk",
);
const WORKER_SCRIPT_PATH = join(WORK_DIR, "worker.ps1");
const LAUNCHER_VBS_PATH = join(WORK_DIR, "launcher.vbs");
const FLAG_FILE = join(WORK_DIR, "running.flag");
const REQUEST_FILE = join(WORK_DIR, "request.json");
const RESPONSE_FILE = join(WORK_DIR, "response.json");
const LOG_FILE = join(WORK_DIR, "setup.log");
const SETUP_PS_PATH = join(tmpdir(), "raycast_windhawk_setup.ps1");
const HELPER_VBS_PATH = join(tmpdir(), "raycast_windhawk_helper.vbs");

/**
 * Checks whether the elevated background worker is currently active and alive in Session 1.
 */
export async function isWorkerRunning(): Promise<boolean> {
  try {
    const pidStr = await readFile(FLAG_FILE, "utf-8");
    const pid = parseInt(pidStr.trim(), 10);

    if (Number.isNaN(pid)) {
      await cleanupStaleFiles();
      return false;
    }

    const { stdout } = await execFileAsync("tasklist.exe", ["/FI", `PID eq ${pid}`, "/NH", "/FO", "CSV"], {
      timeout: 3000,
    });

    if (stdout.includes(String(pid))) {
      return true;
    }

    await cleanupStaleFiles();
    return false;
  } catch {
    return false;
  }
}

async function cleanupStaleFiles(): Promise<void> {
  await unlink(FLAG_FILE).catch(() => {});
  await unlink(REQUEST_FILE).catch(() => {});
  await unlink(RESPONSE_FILE).catch(() => {});
}

/**
 * Generates the VBScript launcher that executes worker.ps1 silently.
 */
function getLauncherVbsContent(): string {
  const workerPathEscaped = WORKER_SCRIPT_PATH.replace(/\\/g, "\\\\");
  return [
    `q = Chr(34)`,
    `Set objShell = CreateObject("WScript.Shell")`,
    `objShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & q & "${workerPathEscaped}" & q, 0, False`,
  ].join("\r\n");
}

/**
 * Registers the logon scheduled task and starts the elevated worker process.
 */
export async function registerWorker(): Promise<void> {
  try {
    await mkdir(WORK_DIR, { recursive: true });
    await writeFile(LOG_FILE, `${new Date().toISOString()} ts: new registration attempt\n`, "utf-8").catch(() => {});

    const escapedFlagPath = FLAG_FILE.replace(/\\/g, "\\\\");
    const escapedReqPath = REQUEST_FILE.replace(/\\/g, "\\\\");
    const escapedResPath = RESPONSE_FILE.replace(/\\/g, "\\\\");
    const escapedLogPath = LOG_FILE.replace(/\\/g, "\\\\");

    const workerPsContent = `
      $ErrorActionPreference = "Continue"
      Add-Content -Path "${escapedLogPath}" -Value "$(Get-Date -Format o) worker: started pid=$PID"
      Set-Content -Path "${escapedFlagPath}" -Value $PID -Force

      while (Test-Path "${escapedFlagPath}") {
          if (Test-Path "${escapedReqPath}") {
              try {
                  $raw = Get-Content -Path "${escapedReqPath}" -Raw
                  Remove-Item -Path "${escapedReqPath}" -Force -ErrorAction SilentlyContinue
                  $req = $raw | ConvertFrom-Json

                  $out = Invoke-Expression $req.command 2>&1 | Out-String

                  $res = @{
                      success = $true
                      output = $out
                  }
                  $res | ConvertTo-Json | Set-Content -Path "${escapedResPath}" -Force
              } catch {
                  $res = @{
                      success = $false
                      error = $_.Exception.Message
                  }
                  $res | ConvertTo-Json | Set-Content -Path "${escapedResPath}" -Force
              }
          }
          Start-Sleep -Milliseconds 200
      }
    `;

    await writeFile(WORKER_SCRIPT_PATH, workerPsContent, "utf-8");
    await writeFile(LAUNCHER_VBS_PATH, getLauncherVbsContent(), "utf-8");

    const launcherPathEscaped = LAUNCHER_VBS_PATH.replace(/\\/g, "\\\\");
    const setupPsContent = `
      $ErrorActionPreference = "Stop"
      $launcher = "${launcherPathEscaped}"
      $log = "${escapedLogPath}"

      function Log($m) {
          Add-Content -Path $log -Value "$(Get-Date -Format o) setup: $m" -ErrorAction SilentlyContinue
      }

      try {
      Log "elevated setup started"

      try {
          if (Test-Path "${escapedFlagPath}") {
              $pidStr = Get-Content -Path "${escapedFlagPath}"
              $processId = [int]$pidStr
              if ($processId -gt 0) {
                  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
              }
          }
      } catch {}

      Log "old worker killed (if any)"

      $service = New-Object -ComObject "Schedule.Service"
      $service.Connect()
      Log "schedule service connected"
      $folder = $service.GetFolder("\\")

      try {
          $folder.DeleteTask("${TASK_NAME}", 0)
          Log "old task deleted"
      } catch {}

      $task = $service.NewTask(0)
      $task.RegistrationInfo.Description = "Raycast Windhawk Admin Worker"
      $task.Principal.RunLevel = 1
      $task.Principal.LogonType = 3

      $trigger = $task.Triggers.Create(9)
      $trigger.Enabled = $true

      $action = $task.Actions.Create(0)
      $action.Path = "wscript.exe"
      $action.Arguments = "\`"$launcher\`""

      Log "registering task"
      $registeredTask = $folder.RegisterTaskDefinition("${TASK_NAME}", $task, 6, $null, $null, 3)
      Log "task registered (logon autostart)"

      try {
          Start-Process -FilePath "wscript.exe" -ArgumentList "\`"$launcher\`"" -WindowStyle Hidden
          Log "worker launched directly by elevated setup"
      } catch {
          Log ("direct worker launch failed: " + ($_.Exception.Message))
      }

      Remove-Item -Path $PSCommandPath -Force -ErrorAction SilentlyContinue
      } catch {
          Log ("SETUP FAILED: " + ($_ | Out-String).Trim())
          throw
      }
    `;

    await writeFile(SETUP_PS_PATH, setupPsContent, "utf-8");

    const setupPsPathEscaped = SETUP_PS_PATH.replace(/\\/g, "\\\\");
    const helperVbsContent = [
      `q = Chr(34)`,
      `Set objShell = CreateObject("Shell.Application")`,
      `psArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & q & "${setupPsPathEscaped}" & q`,
      `objShell.ShellExecute "powershell.exe", psArgs, "", "runas", 0`,
    ].join("\r\n");

    await writeFile(HELPER_VBS_PATH, helperVbsContent, "utf-8");
    console.log("[admin-worker] artifacts written, launching UAC helper…");
    await execFileAsync("wscript.exe", [HELPER_VBS_PATH]);
    console.log("[admin-worker] helper dispatched, waiting for elevated worker…");

    let active = false;
    let loggedLines = 0;
    const drainSetupLog = async () => {
      const text = await readFile(LOG_FILE, "utf-8").catch(() => "");
      if (!text) return;
      const lines = text.split("\n");
      while (loggedLines < lines.length) {
        const line = lines[loggedLines++].trim();
        if (line) console.log(`[admin-worker] ${line}`);
      }
    };

    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 400));
      await drainSetupLog();
      active = await isWorkerRunning();
      if (active) break;
    }
    await drainSetupLog();

    if (!active) {
      const logTail = await readFile(LOG_FILE, "utf-8")
        .then((t) => t.trim().split("\n").slice(-8).join(" | "))
        .catch(() => "(no setup log was written - elevated powershell never ran)");
      throw new Error(`Worker setup was cancelled by user or failed to start. Setup log: ${logTail}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to register admin worker: ${message}`);
  } finally {
    await unlink(HELPER_VBS_PATH).catch(() => {});
  }
}

/**
 * Terminates the active worker process and removes the scheduled task from Windows.
 */
export async function unregisterWorker(): Promise<void> {
  try {
    const escapedFlagPath = FLAG_FILE.replace(/\\/g, "\\\\");
    const escapedWorkDir = WORK_DIR.replace(/\\/g, "\\\\");

    const cleanupPsContent = `
      $ErrorActionPreference = "SilentlyContinue"

      if (Test-Path "${escapedFlagPath}") {
          $pidStr = Get-Content -Path "${escapedFlagPath}"
          $processId = [int]$pidStr
          if ($processId -gt 0) {
              Stop-Process -Id $processId -Force
          }
      }

      $service = New-Object -ComObject "Schedule.Service"
      $service.Connect()
      $folder = $service.GetFolder("\\")
      $folder.DeleteTask("${TASK_NAME}", 0)

      Start-Sleep -Milliseconds 200
      Remove-Item -Path "${escapedWorkDir}\\*" -Force -Recurse

      Remove-Item -Path $PSCommandPath -Force
    `;

    const cleanupPsPath = join(tmpdir(), "raycast_windhawk_cleanup.ps1");
    await writeFile(cleanupPsPath, cleanupPsContent, "utf-8");

    const cleanupVbsContent = [
      `q = Chr(34)`,
      `Set objShell = CreateObject("Shell.Application")`,
      `psArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & q & "${cleanupPsPath.replace(/\\/g, "\\\\")}" & q`,
      `objShell.ShellExecute "powershell.exe", psArgs, "", "runas", 0`,
    ].join("\r\n");

    const cleanupVbsPath = join(tmpdir(), "raycast_windhawk_cleanup.vbs");
    await writeFile(cleanupVbsPath, cleanupVbsContent, "utf-8");

    await execFileAsync("wscript.exe", [cleanupVbsPath]);
    await unlink(cleanupVbsPath).catch(() => {});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to unregister admin worker: ${message}`);
  }
}

/**
 * Sends a command to the active elevated worker.
 */
export async function runElevatedCommand(command: string): Promise<string> {
  const active = await isWorkerRunning();
  if (!active) {
    throw new Error("Admin worker is not running. Run registerWorker() first.");
  }

  try {
    await unlink(RESPONSE_FILE).catch(() => {});

    const payload = JSON.stringify({ command });
    await writeFile(REQUEST_FILE, payload, "utf-8");

    let responseText = "";
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        responseText = await readFile(RESPONSE_FILE, "utf-8");
        if (responseText.trim().length > 0) {
          break;
        }
      } catch {
        // Response file not written yet
      }
    }

    if (!responseText) {
      throw new Error("Worker timed out or did not respond.");
    }

    const res = JSON.parse(responseText) as { success: boolean; output?: string; error?: string };
    await unlink(RESPONSE_FILE).catch(() => {});

    if (!res.success) {
      throw new Error(res.error || "Elevated execution failed.");
    }

    const output = (res.output || "").trim();

    if (
      output.includes("is not recognized as an internal or external command") ||
      output.includes("Access is denied")
    ) {
      throw new Error(output);
    }

    return output || "Command executed successfully.";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message);
  }
}
