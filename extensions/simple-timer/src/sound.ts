import { spawn, ChildProcess, execSync } from "child_process";
import path from "path";
import fs from "fs";
import { environment } from "@raycast/api";

const soundProcesses = new Map<string, ChildProcess>();

// Persist PIDs to file so we can kill them even after Raycast restarts
function getPidFile(): string {
  return path.join(environment.supportPath, "sound-pids.json");
}

function readPids(): Record<string, number> {
  try { return JSON.parse(fs.readFileSync(getPidFile(), "utf8")); }
  catch { return {}; }
}

function writePids(pids: Record<string, number>): void {
  fs.mkdirSync(path.dirname(getPidFile()), { recursive: true });
  fs.writeFileSync(getPidFile(), JSON.stringify(pids));
}

function killPid(pid: number): void {
  try {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
  } catch { /* ignore */ }
}

export function startAlertSound(assetPath: string, volume = 75, timerId = "default"): void {
  stopAlertSound(timerId);

  const wavPath = path.resolve(assetPath).replace(/\\/g, "/");
  const vol = Math.max(1, Math.min(100, volume)) / 100;

  const ps = `Add-Type -AssemblyName PresentationCore; $p = New-Object System.Windows.Media.MediaPlayer; $p.Open([Uri]'${wavPath}'); $p.Volume = ${vol}; $p.Play(); while ($true) { Start-Sleep -Milliseconds 500; if ($p.NaturalDuration.HasTimeSpan -and $p.Position -ge $p.NaturalDuration.TimeSpan) { $p.Position = [TimeSpan]::Zero; $p.Play(); } }`;

  try {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      detached: false,
      stdio: "ignore",
      windowsHide: true,
    });
    soundProcesses.set(timerId, child);

    // Save PID so we can kill it after restart
    if (child.pid) {
      const pids = readPids();
      pids[timerId] = child.pid;
      writePids(pids);
    }
  } catch {
    // silently ignore
  }
}

export function stopAlertSound(timerId = "default"): void {
  // Kill in-memory process
  const child = soundProcesses.get(timerId);
  if (child) {
    try { child.kill(); } catch { /* ignore */ }
    soundProcesses.delete(timerId);
  }

  // Also kill by saved PID (handles case where Raycast restarted)
  const pids = readPids();
  if (pids[timerId]) {
    killPid(pids[timerId]);
    delete pids[timerId];
    writePids(pids);
  }
  // Note: worker-started sounds are killed by worker itself when timer is dismissed/cancelled
}

export function previewSound(assetPath: string, volume = 75): void {
  const wavPath = path.resolve(assetPath).replace(/\\/g, "/");
  const vol = Math.max(1, Math.min(100, volume)) / 100;
  const ps = `Add-Type -AssemblyName PresentationCore; $p = New-Object System.Windows.Media.MediaPlayer; $p.Open([Uri]'${wavPath}'); $p.Volume = ${vol}; $p.Play(); Start-Sleep -Seconds 3; $p.Stop()`;
  try {
    spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      detached: false,
      stdio: "ignore",
      windowsHide: true,
    });
  } catch { /* ignore */ }
}

export function stopAllAlertSounds(): void {
  // Kill all in-memory Raycast sound processes
  soundProcesses.forEach((child) => {
    try { child.kill(); } catch { /* ignore */ }
  });
  soundProcesses.clear();

  // Kill all saved PIDs
  const pids = readPids();
  Object.values(pids).forEach(killPid);
  writePids({});

  // Kill all powershell (covers both Raycast and worker sound processes)
  try {
    execSync(`taskkill /IM powershell.exe /F`, { stdio: "ignore" });
  } catch { /* ignore */ }
}
