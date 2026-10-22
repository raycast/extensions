import { environment } from '@raycast/api';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

let cachedScriptPath: string | null = null;
let cachedIconPath: string | null = null;

export function getHelperScriptPath(): string {
  if (cachedScriptPath && fs.existsSync(cachedScriptPath)) {
    return cachedScriptPath;
  }

  const candidates: string[] = [];

  if (environment.assetsPath) {
    candidates.push(path.join(environment.assetsPath, 'scripts', 'caffeine-helper.ps1'));
    candidates.push(path.join(environment.assetsPath, 'caffeine-helper.ps1'));
  }

  candidates.push(path.join(__dirname, '..', '..', 'assets', 'scripts', 'caffeine-helper.ps1'));
  candidates.push(path.join(__dirname, '..', 'assets', 'scripts', 'caffeine-helper.ps1'));
  candidates.push(path.join(process.cwd(), 'assets', 'scripts', 'caffeine-helper.ps1'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      cachedScriptPath = candidate;
      return candidate;
    }
  }

  throw new Error('Caffeine PowerShell helper script not found in extension assets.');
}

export function getIconPath(): string | null {
  if (cachedIconPath && fs.existsSync(cachedIconPath)) {
    return cachedIconPath;
  }

  const candidates: string[] = [];

  if (environment.assetsPath) {
    candidates.push(path.join(environment.assetsPath, 'icon.png'));
  }

  candidates.push(path.join(__dirname, '..', '..', 'assets', 'icon.png'));
  candidates.push(path.join(__dirname, '..', 'assets', 'icon.png'));
  candidates.push(path.join(process.cwd(), 'assets', 'icon.png'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      cachedIconPath = candidate;
      return candidate;
    }
  }

  return null;
}

/**
 * Verifies if a PID is alive and belongs to the expected Caffeine PowerShell helper.
 */
export function isPidAlive(pid: number | undefined): boolean {
  if (!pid || typeof pid !== 'number' || isNaN(pid) || pid <= 0 || pid === process.pid) {
    return false;
  }

  try {
    process.kill(pid, 0);

    const output = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], {
      windowsHide: true,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return output.toLowerCase().includes('powershell');
  } catch {
    return false;
  }
}

/**
 * Launches the background Caffeine PowerShell helper using Windows native Start-Process.
 * durationSeconds = 0 runs indefinitely until stopped.
 * durationSeconds > 0 runs for the specified duration.
 */
export function launchHelperProcess(durationSeconds: number, preventDisplaySleep: boolean): number {
  const scriptPath = getHelperScriptPath();
  const iconPath = getIconPath();
  const safeDuration = Math.max(0, Math.floor(durationSeconds));
  const safeDisplayFlag = preventDisplaySleep ? '1' : '0';

  const escapedScriptPath = scriptPath.replace(/"/g, '`"');
  const psArgs = [
    "'-NoProfile'",
    "'-NonInteractive'",
    "'-WindowStyle'",
    "'Hidden'",
    "'-ExecutionPolicy'",
    "'Bypass'",
    "'-File'",
    `'"${escapedScriptPath}"'`,
    "'-DurationSeconds'",
    `'${safeDuration}'`,
    "'-PreventDisplaySleep'",
    `'${safeDisplayFlag}'`,
  ];

  if (iconPath) {
    const escapedIconPath = iconPath.replace(/"/g, '`"');
    psArgs.push("'-IconPath'", `'"${escapedIconPath}"'`);
  }

  const psCommand = `Start-Process powershell.exe -ArgumentList @(${psArgs.join(',')}) -WindowStyle Hidden -PassThru | Select-Object -ExpandProperty Id`;

  const output = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCommand],
    {
      windowsHide: true,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    },
  );

  const pid = parseInt(output.trim(), 10);
  if (isNaN(pid) || pid <= 0) {
    throw new Error('Failed to obtain a valid process ID for the Caffeine background helper.');
  }

  return pid;
}

/**
 * Safely and gracefully terminates the background helper process by PID.
 * Signals the Named Event so the helper runs its finally block (disposing the system tray icon),
 * then refreshes the taskbar notification area to prevent ghost icons.
 */
export function terminateHelperProcess(pid: number | undefined): void {
  if (!pid || typeof pid !== 'number' || isNaN(pid) || pid <= 0 || pid === process.pid) {
    return;
  }

  try {
    const stopCmd = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class TrayRefresher {
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);
    [DllImport("user32.dll")]
    static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
    const uint WM_MOUSEMOVE = 0x0200;
    public static void Refresh() {
        IntPtr tray = FindWindow("Shell_TrayWnd", null);
        if (tray != IntPtr.Zero) {
            IntPtr notify = FindWindowEx(tray, IntPtr.Zero, "TrayNotifyWnd", null);
            if (notify != IntPtr.Zero) {
                IntPtr pager = FindWindowEx(notify, IntPtr.Zero, "SysPager", null);
                IntPtr tb = pager != IntPtr.Zero ? FindWindowEx(pager, IntPtr.Zero, "ToolbarWindow32", null) : FindWindowEx(notify, IntPtr.Zero, "ToolbarWindow32", null);
                if (tb != IntPtr.Zero) RefreshTb(tb);
            }
        }
        IntPtr overflow = FindWindow("NotifyIconOverflowWindow", null);
        if (overflow != IntPtr.Zero) {
            IntPtr tb = FindWindowEx(overflow, IntPtr.Zero, "ToolbarWindow32", null);
            if (tb != IntPtr.Zero) RefreshTb(tb);
        }
    }
    private static void RefreshTb(IntPtr tb) {
        RECT r;
        if (GetClientRect(tb, out r)) {
            for (int x = 0; x < r.Right; x += 8) {
                for (int y = 0; y < r.Bottom; y += 8) {
                    SendMessage(tb, WM_MOUSEMOVE, IntPtr.Zero, (IntPtr)((y << 16) | (x & 0xFFFF)));
                }
            }
        }
    }
}
"@
try {
    $e = [System.Threading.EventWaitHandle]::OpenExisting('Local\\Caffeine_Stop_${pid}')
    $e.Set() | Out-Null
    $e.Close()
} catch {}
Start-Sleep -Milliseconds 120
[TrayRefresher]::Refresh()
`;

    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', stopCmd],
      {
        windowsHide: true,
        stdio: 'ignore',
        timeout: 2000,
      },
    );
  } catch {
    // Ignore error
  }

  // Fallback: If still running after grace period, terminate process
  if (isPidAlive(pid)) {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/F', '/T'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    } catch {
      // Process may have already exited
    }
  }
}
