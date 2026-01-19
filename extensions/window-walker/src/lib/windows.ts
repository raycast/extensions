import { execSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, readdirSync, statSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { WindowInfo } from "./types";
import { environment } from "@raycast/api";

// Temp file prefix for easy identification and cleanup
const TEMP_PREFIX = "raycast-ww-";
const ICON_CACHE_DIR = join(environment.supportPath, "icons");

// Ensure icon cache directory exists
try {
  if (!existsSync(ICON_CACHE_DIR)) {
    mkdirSync(ICON_CACHE_DIR, { recursive: true });
  }
} catch {
  // Ignore
}

/**
 * Clean up any stale temp files from previous runs.
 * Called on module load to ensure no leftover files.
 */
function cleanupStaleTempFiles(): void {
  try {
    const tempDir = tmpdir();
    const files = readdirSync(tempDir);
    const now = Date.now();
    const maxAge = 60 * 1000; // 1 minute

    for (const file of files) {
      if (file.startsWith(TEMP_PREFIX) && file.endsWith(".ps1")) {
        const filePath = join(tempDir, file);
        try {
          const stats = statSync(filePath);
          // Delete files older than maxAge
          if (now - stats.mtimeMs > maxAge) {
            unlinkSync(filePath);
          }
        } catch {
          // Ignore individual file errors
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Clean up old icon cache files not accessed in 7 days.
 * Called on module load to keep cache size manageable.
 */
function cleanupOldIconCache(): void {
  try {
    if (!existsSync(ICON_CACHE_DIR)) return;

    const files = readdirSync(ICON_CACHE_DIR);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const file of files) {
      if (file.endsWith(".png")) {
        const filePath = join(ICON_CACHE_DIR, file);
        try {
          const stats = statSync(filePath);
          // Delete icons not accessed in 7 days (use atime if available, else mtime)
          const lastAccess = stats.atimeMs || stats.mtimeMs;
          if (now - lastAccess > maxAge) {
            unlinkSync(filePath);
          }
        } catch {
          // Ignore individual file errors
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Run cleanup on module load
cleanupStaleTempFiles();
cleanupOldIconCache();

/**
 * PowerShell script to enumerate all visible windows with extended properties.
 */
const LIST_WINDOWS_SCRIPT = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Diagnostics;
using System.Collections.Generic;

public class WinEnum {
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] static extern IntPtr GetShellWindow();
    [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out bool pvAttribute, int cbAttribute);
    
    const int GWL_EXSTYLE = -20;
    const int WS_EX_TOOLWINDOW = 0x80;
    const int WS_EX_TOPMOST = 0x8;
    const int DWMWA_CLOAKED = 14;
    
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    static List<string> windows = new List<string>();
    static IntPtr shellWindow;
    
    public static string[] GetWindows() {
        windows.Clear();
        shellWindow = GetShellWindow();
        EnumWindows(Callback, IntPtr.Zero);
        return windows.ToArray();
    }
    
    static bool Callback(IntPtr hWnd, IntPtr lParam) {
        if (hWnd == shellWindow) return true;
        if (!IsWindowVisible(hWnd)) return true;
        int len = GetWindowTextLength(hWnd);
        if (len == 0) return true;
        int ex = GetWindowLong(hWnd, GWL_EXSTYLE);
        if ((ex & WS_EX_TOOLWINDOW) != 0) return true;
        bool cloaked = false;
        try { DwmGetWindowAttribute(hWnd, DWMWA_CLOAKED, out cloaked, 4); } catch {}
        if (cloaked) return true;
        
        StringBuilder sb = new StringBuilder(len + 1);
        GetWindowText(hWnd, sb, sb.Capacity);
        string title = sb.ToString();
        
        uint pid; GetWindowThreadProcessId(hWnd, out pid);
        string pname = "", ppath = "";
        try {
            Process p = Process.GetProcessById((int)pid);
            pname = p.ProcessName;
            try { ppath = p.MainModule.FileName; } catch {}
        } catch {}
        
        // Check if window is topmost
        bool isTopMost = (ex & WS_EX_TOPMOST) != 0;
        
        title = title.Replace("|", " ").Replace("\\r", " ").Replace("\\n", " ");
        ppath = ppath.Replace("|", " ");
        
        // Format: handle|title|processName|processPath|isTopMost
        windows.Add(hWnd.ToInt64() + "|" + title + "|" + pname + "|" + ppath + "|" + (isTopMost ? "1" : "0"));
        return true;
    }
}
'@
[WinEnum]::GetWindows() | ForEach-Object { Write-Output $_ }
`;

/**
 * Execute a PowerShell script using a temp file.
 * Ensures cleanup in all cases.
 */
function runPowerShell(script: string): string {
  const tempFile = join(tmpdir(), `${TEMP_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.ps1`);
  try {
    // Force UTF-8 encoding for PowerShell output
    const utf8Script = `$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8\n${script}`;
    writeFileSync(tempFile, utf8Script, "utf-8");
    const result = execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tempFile}"`, {
      encoding: "utf-8",
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return result.trim();
  } catch (error) {
    console.error("PowerShell execution error:", error);
    return "";
  } finally {
    // Always attempt cleanup
    try {
      if (existsSync(tempFile)) {
        unlinkSync(tempFile);
      }
    } catch {
      // Ignore cleanup errors - will be caught by stale file cleanup
    }
  }
}

// In-memory cache for icon paths (process name -> icon path or null)
const iconCache = new Map<string, string | null>();
// Track pending icon extractions to avoid duplicate work
const pendingExtractions = new Set<string>();

/**
 * Fast icon lookup - only returns cached icons, never blocks for extraction.
 */
export function getCachedIcon(processName: string): string | null {
  const cacheKey = processName.toLowerCase();

  // Check in-memory cache
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey) || null;
  }

  // Check disk cache (fast filesystem check)
  const iconPath = join(ICON_CACHE_DIR, `${cacheKey}.png`);
  if (existsSync(iconPath)) {
    iconCache.set(cacheKey, iconPath);
    return iconPath;
  }

  return null;
}

/**
 * Extract icon from an executable and save as PNG.
 * Returns the path to the cached icon, or null if extraction failed.
 * Uses in-memory cache to avoid repeated filesystem checks.
 */
export function extractAppIcon(processPath: string, processName: string): string | null {
  const cacheKey = processName.toLowerCase();

  // Check in-memory cache first
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey) || null;
  }

  if (!processPath || !existsSync(processPath)) {
    iconCache.set(cacheKey, null);
    return null;
  }

  // Use process name as cache key for disk
  const iconPath = join(ICON_CACHE_DIR, `${cacheKey}.png`);

  // Return cached icon if exists on disk
  if (existsSync(iconPath)) {
    iconCache.set(cacheKey, iconPath);
    return iconPath;
  }

  // Extract icon using PowerShell
  const script = `
Add-Type -AssemblyName System.Drawing
$exePath = "${processPath.replace(/\\/g, "\\\\")}"
$iconPath = "${iconPath.replace(/\\/g, "\\\\")}"
try {
  $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
  if ($icon) {
    $bitmap = $icon.ToBitmap()
    $bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    $icon.Dispose()
    Write-Output "OK"
  }
} catch {
  Write-Output "FAIL"
}
`;

  const result = runPowerShell(script);
  if (result === "OK" && existsSync(iconPath)) {
    iconCache.set(cacheKey, iconPath);
    return iconPath;
  }

  iconCache.set(cacheKey, null);
  return null;
}

/**
 * Extract icons for windows that don't have cached icons yet.
 * Call this after initial window display for deferred icon loading.
 */
export function extractMissingIcons(windows: WindowInfo[]): void {
  for (const w of windows) {
    const cacheKey = w.processName.toLowerCase();
    // Skip if already cached or already pending
    if (iconCache.has(cacheKey) || pendingExtractions.has(cacheKey)) {
      continue;
    }
    pendingExtractions.add(cacheKey);
    // Extract synchronously but mark as pending to avoid duplicates
    extractAppIcon(w.processPath, w.processName);
    pendingExtractions.delete(cacheKey);
  }
}

// Window list cache for instant loading
let cachedWindowList: WindowInfo[] = [];
let cacheTimestamp = 0;
const CACHE_MAX_AGE = 5000; // 5 seconds before cache considered stale

/**
 * Get a list of all visible windows.
 * Returns cached results instantly if available, refreshes in background.
 */
export function listWindows(): WindowInfo[] {
  const now = Date.now();

  // Return cached list instantly, schedule background refresh if stale
  if (cachedWindowList.length > 0) {
    if (now - cacheTimestamp > CACHE_MAX_AGE) {
      // Cache is stale, refresh in background
      setTimeout(() => {
        refreshWindowListCache();
      }, 0);
    }
    return cachedWindowList;
  }

  // No cache, do synchronous fetch
  return refreshWindowListCache();
}

/**
 * Force refresh the window list cache (call this after user actions).
 */
export function refreshWindowListCache(): WindowInfo[] {
  const output = runPowerShell(LIST_WINDOWS_SCRIPT);
  if (!output) return cachedWindowList; // Return old cache on error

  const windows: WindowInfo[] = [];
  const windowsNeedingIcons: WindowInfo[] = [];
  const lines = output.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split("|");
    if (parts.length >= 5) {
      const handle = parseInt(parts[0], 10);
      const title = parts[1];
      const processName = parts[2];
      const processPath = parts[3];
      const isTopMost = parts[4] === "1";

      if (isNaN(handle) || !title) continue;

      // Use cached icons only for fast loading
      const iconPath = getCachedIcon(processName);
      const windowInfo: WindowInfo = {
        handle,
        title,
        processName,
        processPath,
        isTopMost,
        iconPath: iconPath || undefined,
      };
      windows.push(windowInfo);

      // Track windows needing icon extraction
      if (!iconPath && processPath) {
        windowsNeedingIcons.push(windowInfo);
      }
    }
  }

  // Update cache
  cachedWindowList = windows;
  cacheTimestamp = Date.now();

  // Schedule background icon extraction for windows without cached icons
  if (windowsNeedingIcons.length > 0) {
    setTimeout(() => {
      extractMissingIcons(windowsNeedingIcons);
    }, 100);
  }

  return windows;
}

/**
 * Switch to (activate) a window.
 */
export function switchToWindow(handle: number): void {
  const script = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinAct {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    public static void Go(long h) {
        IntPtr w = new IntPtr(h);
        if (IsIconic(w)) ShowWindow(w, 9);
        SetForegroundWindow(w);
    }
}
'@
[WinAct]::Go(${handle})
`;
  runPowerShell(script);
}

/**
 * Minimize a window.
 */
export function minimizeWindow(handle: number): void {
  const script = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinMin {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    public static void Go(long h) { ShowWindow(new IntPtr(h), 6); }
}
'@
[WinMin]::Go(${handle})
`;
  runPowerShell(script);
}

/**
 * Close a window gracefully.
 */
export function closeWindow(handle: number): void {
  const script = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinClose {
    [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    public static void Go(long h) { SendMessage(new IntPtr(h), 0x0010, IntPtr.Zero, IntPtr.Zero); }
}
'@
[WinClose]::Go(${handle})
`;
  runPowerShell(script);
}

/**
 * Move and resize a window.
 */
export function moveWindow(handle: number, x: number, y: number, width: number, height: number): void {
  const script = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinMove {
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    public static void Go(long h, int x, int y, int w, int ht) {
        IntPtr hwnd = new IntPtr(h);
        ShowWindow(hwnd, 9); // SW_RESTORE
        MoveWindow(hwnd, x, y, w, ht, true);
    }
}
'@
[WinMove]::Go(${handle}, ${x}, ${y}, ${width}, ${height})
`;
  runPowerShell(script);
}

/**
 * Screen/monitor info
 */
export interface ScreenInfo {
  name: string;
  isPrimary: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get all monitors/screens.
 */
export function getAllScreens(): ScreenInfo[] {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
  $wa = $_.WorkingArea
  $primary = if ($_.Primary) { "1" } else { "0" }
  Write-Output "$($_.DeviceName)|$primary|$($wa.X)|$($wa.Y)|$($wa.Width)|$($wa.Height)"
}
`;
  const output = runPowerShell(script);
  if (!output) return [{ name: "Primary", isPrimary: true, x: 0, y: 0, width: 1920, height: 1080 }];

  const screens: ScreenInfo[] = [];
  const lines = output.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split("|");
    if (parts.length >= 6) {
      screens.push({
        name: `Monitor ${i + 1}`,
        isPrimary: parts[1] === "1",
        x: parseInt(parts[2], 10) || 0,
        y: parseInt(parts[3], 10) || 0,
        width: parseInt(parts[4], 10) || 1920,
        height: parseInt(parts[5], 10) || 1080,
      });
    }
  }

  return screens.length > 0 ? screens : [{ name: "Primary", isPrimary: true, x: 0, y: 0, width: 1920, height: 1080 }];
}

/**
 * Get primary monitor/screen dimensions.
 */
export function getScreenBounds(): { width: number; height: number; x: number; y: number } {
  const screens = getAllScreens();
  const primary = screens.find((s) => s.isPrimary) || screens[0];
  return { x: primary.x, y: primary.y, width: primary.width, height: primary.height };
}

/**
 * Minimize all windows except the specified one.
 * IMPORTANT: Never minimizes Raycast windows to avoid killing the extension.
 */
export function minimizeAllExcept(handleToKeep: number): void {
  const windows = listWindows();
  for (const w of windows) {
    // Never minimize Raycast windows
    if (w.processName.toLowerCase() === "raycast") continue;
    if (w.handle !== handleToKeep) {
      minimizeWindow(w.handle);
    }
  }
}

/**
 * Close all windows for a specific process.
 * IMPORTANT: Never closes Raycast windows.
 */
export function closeAllForProcess(processName: string): void {
  // Never close Raycast
  if (processName.toLowerCase() === "raycast") return;

  const windows = listWindows();
  for (const w of windows) {
    if (w.processName.toLowerCase() === processName.toLowerCase()) {
      closeWindow(w.handle);
    }
  }
}

/**
 * Toggle always-on-top for a window.
 */
export function toggleAlwaysOnTop(handle: number, enable: boolean): void {
  const hwndInsertAfter = enable ? -1 : -2; // HWND_TOPMOST or HWND_NOTOPMOST
  const script = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinTop {
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    public static void Go(long h, int insertAfter) {
        SetWindowPos(new IntPtr(h), new IntPtr(insertAfter), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0010);
    }
}
'@
[WinTop]::Go(${handle}, ${hwndInsertAfter})
`;
  runPowerShell(script);
}
