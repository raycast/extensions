import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { getCliPath } from "./helpers";

const execFileAsync = promisify(execFile);

export const TASK_NAME = "RaycastWindhawkAdminWorker";

export type WorkerAction = "enable" | "disable" | "install" | "update" | "uninstall";

const VALID_ACTIONS: WorkerAction[] = ["enable", "disable", "install", "update", "uninstall"];
const VALID_ARG = /^[A-Za-z0-9_.-]+$/;

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
const LOG_FILE = join(WORK_DIR, "setup.log");
const SETUP_PS_PATH = join(tmpdir(), "raycast_windhawk_setup.ps1");
const HELPER_VBS_PATH = join(tmpdir(), "raycast_windhawk_helper.vbs");

async function readPid(): Promise<number | null> {
  try {
    const pidStr = (await readFile(FLAG_FILE, "utf-8")).trim();
    const pid = parseInt(pidStr, 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

async function isProcessAlive(pid: number): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("tasklist.exe", ["/FI", `PID eq ${pid}`, "/NH", "/FO", "CSV"], {
      timeout: 3000,
    });
    return stdout.includes(String(pid));
  } catch {
    return false;
  }
}

/**
 * Checks whether the elevated background worker is currently active and alive in Session 1.
 */
export async function isWorkerRunning(): Promise<boolean> {
  try {
    const pid = await readPid();
    if (pid === null) {
      await cleanupStaleFiles();
      return false;
    }

    if (await isProcessAlive(pid)) {
      return true;
    }

    await cleanupStaleFiles();
    return false;
  } catch {
    return false;
  }
}

async function taskExists(): Promise<boolean> {
  try {
    await execFileAsync("schtasks.exe", ["/Query", "/TN", TASK_NAME], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

async function cleanupStaleFiles(): Promise<void> {
  await unlink(FLAG_FILE).catch(() => {});
  const entries = await readdir(WORK_DIR).catch(() => [] as string[]);
  for (const name of entries) {
    if (name.startsWith("request_") || name.startsWith("response_")) {
      await unlink(join(WORK_DIR, name)).catch(() => {});
    }
  }
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
 * Builds the worker's PowerShell source. The worker accepts ONLY a fixed
 * allowlist of actions with a validated mod id/version; the Windhawk CLI path
 * is baked in at registration time and is never taken from a request. Native
 * exit codes drive success, not text sniffing. Requests and responses use
 * unique per-request files so concurrent callers never collide.
 */
function getWorkerScriptContent(cliPath: string): string {
  const esc = (value: string) => value.replace(/\\/g, "\\\\");
  const escapedFlagPath = esc(FLAG_FILE);
  const escapedWorkDir = esc(WORK_DIR);
  const escapedCliPath = esc(cliPath);
  const escapedLogPath = esc(LOG_FILE);

  return `
    $ErrorActionPreference = "Continue"
    Add-Content -Path "${escapedLogPath}" -Value "$(Get-Date -Format o) worker: started pid=$PID"
    Set-Content -Path "${escapedFlagPath}" -Value $PID -Force

    while (Test-Path "${escapedFlagPath}") {
        $pending = @(Get-ChildItem -Path "${escapedWorkDir}" -Filter "request_*.json" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime)
        foreach ($file in $pending) {
            $req = $null
            $responseId = "unknown"
            $out = ""
            $exit = 0
            $err = $null
            try {
                $raw = Get-Content -Path $file.FullName -Raw
                Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
                $req = $raw | ConvertFrom-Json

                $responseId = [string]$req.id
                $action = [string]$req.action
                $modId = [string]$req.modId
                $version = [string]$req.version

                switch ($action) {
                    "enable" { $out = & "${escapedCliPath}" mod enable $modId 2>&1; $exit = $LASTEXITCODE }
                    "disable" { $out = & "${escapedCliPath}" mod disable $modId 2>&1; $exit = $LASTEXITCODE }
                    "update" { $out = & "${escapedCliPath}" mod update $modId 2>&1; $exit = $LASTEXITCODE }
                    "uninstall" { $out = & "${escapedCliPath}" mod remove $modId --yes 2>&1; $exit = $LASTEXITCODE }
                    "install" {
                        if ($version -eq "") {
                            $out = & "${escapedCliPath}" mod install $modId 2>&1
                        } else {
                            $out = & "${escapedCliPath}" mod install $modId $version 2>&1
                        }
                        $exit = $LASTEXITCODE
                    }
                    default { throw "Unknown action: $action" }
                }
            } catch {
                $err = $_.Exception.Message
            }

            $res = @{
                id = $responseId
                success = (($exit -eq 0) -and ($null -eq $err))
                output = ($out | Out-String)
                error = $err
            }
            $res | ConvertTo-Json | Set-Content -Path "${escapedWorkDir}\\response_$responseId.json" -Force
        }
        Start-Sleep -Milliseconds 200
    }
  `;
}

/**
 * Registers the logon scheduled task and starts the elevated worker process.
 */
export async function registerWorker(): Promise<void> {
  try {
    await mkdir(WORK_DIR, { recursive: true });
    await writeFile(LOG_FILE, `${new Date().toISOString()} ts: new registration attempt\n`, "utf-8").catch(() => {});

    const cliPath = getCliPath();
    const esc = (value: string) => value.replace(/\\/g, "\\\\");
    const escapedFlagPath = esc(FLAG_FILE);

    const workerPsContent = getWorkerScriptContent(cliPath);

    await writeFile(WORKER_SCRIPT_PATH, workerPsContent, "utf-8");
    await writeFile(LAUNCHER_VBS_PATH, getLauncherVbsContent(), "utf-8");

    const launcherPathEscaped = escapePathForPowerShell(LAUNCHER_VBS_PATH);
    const setupPsContent = `
      $ErrorActionPreference = "Stop"
      $launcher = "${launcherPathEscaped}"
      $log = "${escapePathForPowerShell(LOG_FILE)}"

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

function escapePathForPowerShell(value: string): string {
  return value.replace(/\\/g, "\\\\");
}

/**
 * Terminates the active worker process, removes the scheduled task and wipes
 * the work dir. Resolves only after the removal is verified (task gone, worker
 * dead, flag file removed); throws if the cleanup never ran, e.g. UAC cancelled.
 */
export async function unregisterWorker(): Promise<void> {
  try {
    const escapedFlagPath = escapePathForPowerShell(FLAG_FILE);
    const escapedWorkDir = escapePathForPowerShell(WORK_DIR);

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

    let verified = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const pid = await readPid();
      const alive = pid !== null && (await isProcessAlive(pid));
      const flagExists = await readFile(FLAG_FILE, "utf-8")
        .then(() => true)
        .catch(() => false);
      const taskExistsResult = await taskExists();
      if (!alive && !flagExists && !taskExistsResult) {
        verified = true;
        break;
      }
    }

    await unlink(cleanupVbsPath).catch(() => {});

    if (!verified) {
      throw new Error(
        "Unregister did not complete - the UAC prompt may have been cancelled or cleanup failed. The admin worker may still be active.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to unregister admin worker: ${message}`);
  }
}

/**
 * Sends an allowlisted action to the active elevated worker and returns its stdout.
 *
 * The worker never executes arbitrary command strings: only the fixed actions
 * above are accepted, mod ids/versions are validated against a strict charset,
 * and each call uses unique request/response files so concurrent callers stay isolated.
 */
export async function runElevatedCommand(action: WorkerAction, modId: string, version?: string): Promise<string> {
  if (!VALID_ACTIONS.includes(action)) {
    throw new Error(`Blocked: unknown action "${action}".`);
  }
  if (!VALID_ARG.test(modId) || (version !== undefined && version !== "" && !VALID_ARG.test(version))) {
    throw new Error("Blocked: invalid mod id or version.");
  }

  if (!(await isWorkerRunning())) {
    throw new Error("Admin worker is not running. Run registerWorker() first.");
  }

  try {
    const requestId = randomUUID();
    const requestPath = join(WORK_DIR, `request_${requestId}.json`);
    const responsePath = join(WORK_DIR, `response_${requestId}.json`);

    await writeFile(requestPath, JSON.stringify({ id: requestId, action, modId, version: version ?? "" }), "utf-8");

    let responseText = "";
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        responseText = await readFile(responsePath, "utf-8");
        if (responseText.trim().length > 0) break;
      } catch {
        // Response file not written yet
      }
    }

    if (!responseText) {
      throw new Error("Worker timed out or did not respond.");
    }

    const res = JSON.parse(responseText) as { success: boolean; output?: string; error?: string };
    await unlink(responsePath).catch(() => {});

    if (!res.success) {
      throw new Error(res.error || "Elevated execution failed.");
    }

    const output = (res.output || "").trim();
    return output || "Command executed successfully.";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message);
  }
}
