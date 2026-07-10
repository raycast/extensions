import { runAppleScript } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface DisplayInfo {
  index: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visibleX: number;
  visibleY: number;
  visibleWidth: number;
  visibleHeight: number;
  isPrimary: boolean;
  diagonal: number;
}

export interface WindowInfo {
  appName: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const isMac = process.platform === "darwin";

/**
 * Runs a PowerShell script on Windows using Base64 UTF-16LE encoding to avoid syntax issues.
 */
async function runPowerShell(script: string): Promise<string> {
  const buffer = Buffer.from(script, "utf16le");
  const base64 = buffer.toString("base64");
  const { stdout } = await execAsync(`powershell -NoProfile -NonInteractive -EncodedCommand ${base64}`);
  return stdout;
}

/**
 * Retrieves all connected displays and their work areas.
 */
export async function getDisplays(): Promise<DisplayInfo[]> {
  if (isMac) {
    try {
      const result = await runAppleScript(
        `
        ObjC.import('AppKit');
        ObjC.import('CoreGraphics');
        const screens = $.NSScreen.screens;
        const list = [];
        let primaryHeight = 0;
        for (let i = 0; i < screens.count; i++) {
          const s = screens.objectAtIndex(i);
          if (s.frame.origin.x === 0 && s.frame.origin.y === 0) {
            primaryHeight = s.frame.size.height;
            break;
          }
        }
        if (primaryHeight === 0 && screens.count > 0) {
          primaryHeight = screens.objectAtIndex(0).frame.size.height;
        }
        for (let i = 0; i < screens.count; i++) {
          const s = screens.objectAtIndex(i);
          let name = "";
          try {
            name = s.localizedName.js;
          } catch (e) {
            name = "Display " + (i + 1);
          }
          const f = s.frame;
          const vf = s.visibleFrame;
          
          let diagonal = 0;
          try {
            const desc = s.deviceDescription;
            const screenNumber = desc.objectForKey("NSScreenNumber");
            const displayId = screenNumber ? screenNumber.intValue : 0;
            const size = $.CGDisplayScreenSize(displayId);
            const wMM = size.width;
            const hMM = size.height;
            if (wMM > 0 && hMM > 0) {
              diagonal = Math.round(Math.sqrt(wMM * wMM + hMM * hMM) / 25.4);
            }
          } catch (e) {}
          
          if (!diagonal) {
            const h = f.size.height;
            if (h === 1080) diagonal = 24;
            else if (h >= 900 && h <= 1000) diagonal = 14;
            else if (h >= 1400 && h <= 1600) diagonal = 27;
            else diagonal = 24;
          }

          list.push({
            index: i,
            name: name,
            x: f.origin.x,
            y: primaryHeight - (f.origin.y + f.size.height),
            width: f.size.width,
            height: f.size.height,
            visibleX: vf.origin.x,
            visibleY: primaryHeight - (vf.origin.y + vf.size.height),
            visibleWidth: vf.size.width,
            visibleHeight: vf.size.height,
            isPrimary: f.origin.x === 0 && f.origin.y === 0,
            diagonal: diagonal
          });
        }
        JSON.stringify(list);
        `,
        { language: "JavaScript" },
      );
      return JSON.parse(result);
    } catch (error) {
      console.error("Error getting macOS screens:", error);
      // Fallback to a single screen if JXA fails
      return [
        {
          index: 0,
          name: "Main Display",
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          visibleX: 0,
          visibleY: 0,
          visibleWidth: 1920,
          visibleHeight: 1080,
          isPrimary: true,
          diagonal: 24,
        },
      ];
    }
  } else {
    // Windows
    try {
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $basicParams = Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue
        $screens = [System.Windows.Forms.Screen]::AllScreens
        $list = @()
        for ($i=0; $i -lt $screens.Length; $i++) {
            $s = $screens[$i]
            $diag = 0
            if ($basicParams) {
                $param = $null
                if ($basicParams -is [array]) {
                    if ($i -lt $basicParams.Count) { $param = $basicParams[$i] }
                    else { $param = $basicParams[0] }
                } else {
                    $param = $basicParams
                }
                if ($param -and $param.MaxHorizontalImageSize -gt 0 -and $param.MaxVerticalImageSize -gt 0) {
                    $w_cm = $param.MaxHorizontalImageSize
                    $h_cm = $param.MaxVerticalImageSize
                    $diag = [Math]::Round([Math]::Sqrt($w_cm * $w_cm + $h_cm * $h_cm) / 2.54)
                }
            }
            if ($diag -eq 0) {
                $h = $s.Bounds.Height
                if ($h -eq 1080) { $diag = 24 }
                elseif ($h -ge 900 -and $h -le 1000) { $diag = 14 }
                elseif ($h -ge 1400 -and $h -le 1600) { $diag = 27 }
                else { $diag = 24 }
            }
            $list += [PSCustomObject]@{
                index = $i
                name = $s.DeviceName
                x = $s.Bounds.X
                y = $s.Bounds.Y
                width = $s.Bounds.Width
                height = $s.Bounds.Height
                visibleX = $s.WorkingArea.X
                visibleY = $s.WorkingArea.Y
                visibleWidth = $s.WorkingArea.Width
                visibleHeight = $s.WorkingArea.Height
                isPrimary = $s.Primary
                diagonal = $diag
            }
        }
        $list | ConvertTo-Json
      `;
      const result = await runPowerShell(psScript);
      const data = JSON.parse(result);
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error("Error getting Windows screens:", error);
      return [
        {
          index: 0,
          name: "Main Display",
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          visibleX: 0,
          visibleY: 0,
          visibleWidth: 1920,
          visibleHeight: 1080,
          isPrimary: true,
          diagonal: 24,
        },
      ];
    }
  }
}

/**
 * Retrieves information about the currently active window.
 */
export async function getActiveWindow(): Promise<WindowInfo> {
  if (isMac) {
    try {
      const result = await runAppleScript(
        `
        const se = Application("System Events");
        const p = se.processes.whose({frontmost: true})[0];
        if (!p) {
          throw new Error("No active application found");
        }
        const w = p.windows[0];
        if (!w) {
          throw new Error("No active window found");
        }
        const pos = w.position();
        const sz = w.size();
        const title = w.name();
        const appName = p.name();
        JSON.stringify({
          appName,
          title,
          x: pos[0],
          y: pos[1],
          width: sz[0],
          height: sz[1]
        });
        `,
        { language: "JavaScript" },
      );
      return JSON.parse(result);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("not allowed assistive access")) {
        throw new Error(
          "Please grant Accessibility permissions to Raycast in System Settings > Privacy & Security > Accessibility.",
        );
      }
      throw new Error(`Could not get active window: ${errMsg}`);
    }
  } else {
    // Windows
    try {
      const psScript = `
        Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            using System.Text;
            public class Win32 {
                [DllImport("user32.dll")]
                public static extern IntPtr GetForegroundWindow();
                [DllImport("user32.dll")]
                [return: MarshalAs(UnmanagedType.Bool)]
                public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
                [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
                public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
                [DllImport("user32.dll", SetLastError = true)]
                public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
                [StructLayout(LayoutKind.Sequential)]
                public struct RECT {
                    public int Left;
                    public int Top;
                    public int Right;
                    public int Bottom;
                }
            }
        "@
        $hWnd = [Win32]::GetForegroundWindow()
        if ($hWnd -eq [IntPtr]::Zero) {
            throw "No foreground window active"
        }
        $rect = New-Object Win32+RECT
        $title = New-Object System.Text.StringBuilder 512
        [Win32]::GetWindowText($hWnd, $title, 512) | Out-Null
        if ([Win32]::GetWindowRect($hWnd, [ref]$rect)) {
            $processId = 0
            [Win32]::GetWindowThreadProcessId($hWnd, [ref]$processId) | Out-Null
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            $appName = if ($process) { $process.ProcessName } else { "" }
            [PSCustomObject]@{
                appName = $appName
                title = $title.ToString()
                x = $rect.Left
                y = $rect.Top
                width = $rect.Right - $rect.Left
                height = $rect.Bottom - $rect.Top
            } | ConvertTo-Json
        } else {
            throw "Could not get window rect"
        }
      `;
      const result = await runPowerShell(psScript);
      return JSON.parse(result);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not get active window on Windows: ${errMsg}`);
    }
  }
}

/**
 * Resizes and repositions the active window.
 */
export async function resizeActiveWindow(x: number, y: number, width: number, height: number): Promise<void> {
  if (isMac) {
    try {
      await runAppleScript(
        `
        const se = Application("System Events");
        const p = se.processes.whose({frontmost: true})[0];
        if (!p) {
          throw new Error("No active application found");
        }
        const w = p.windows[0];
        if (!w) {
          throw new Error("No active window found");
        }
        w.position.set([${x}, ${y}]);
        w.size.set([${width}, ${height}]);
        `,
        { language: "JavaScript" },
      );
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("not allowed assistive access")) {
        throw new Error(
          "Please grant Accessibility permissions to Raycast in System Settings > Privacy & Security > Accessibility.",
        );
      }
      throw new Error(`Could not resize active window: ${errMsg}`);
    }
  } else {
    // Windows
    try {
      const psScript = `
        Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class Win32 {
                [DllImport("user32.dll")]
                public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
                [DllImport("user32.dll")]
                public static extern IntPtr GetForegroundWindow();
            }
        "@
        $hWnd = [Win32]::GetForegroundWindow()
        if ($hWnd -ne [IntPtr]::Zero) {
            [Win32]::MoveWindow($hWnd, ${x}, ${y}, ${width}, ${height}, $true) | Out-Null
        }
      `;
      await runPowerShell(psScript);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not resize active window on Windows: ${errMsg}`);
    }
  }
}

/**
 * Identifies which display the window is currently positioned on.
 * It uses the center point of the window to determine display containment.
 */
export function getDisplayForWindow(window: WindowInfo, displays: DisplayInfo[]): DisplayInfo {
  if (displays.length === 0) {
    throw new Error("No displays found");
  }

  const windowCenterX = window.x + window.width / 2;
  const windowCenterY = window.y + window.height / 2;

  // 1. Try to find the display containing the window center
  for (const display of displays) {
    if (
      windowCenterX >= display.x &&
      windowCenterX <= display.x + display.width &&
      windowCenterY >= display.y &&
      windowCenterY <= display.y + display.height
    ) {
      return display;
    }
  }

  // 2. Try to find the display containing the window top-left corner
  for (const display of displays) {
    if (
      window.x >= display.x &&
      window.x <= display.x + display.width &&
      window.y >= display.y &&
      window.y <= display.y + display.height
    ) {
      return display;
    }
  }

  // 3. Fallback to primary display, or first display
  const primary = displays.find((d) => d.isPrimary);
  return primary || displays[0];
}

export function getDisplayKey(display: DisplayInfo): string {
  // Normalize the name (remove system display signs on Windows if they vary)
  const cleanName = display.name.replace(/\\\\.\\\\/g, "");
  return `${cleanName}_${display.width}x${display.height}`;
}

/**
 * Checks if Stage Manager is enabled on macOS.
 */
export async function isStageManagerEnabled(): Promise<boolean> {
  if (process.platform !== "darwin") {
    return false;
  }
  try {
    const { stdout } = await execAsync("defaults read com.apple.WindowManager GloballyEnabled");
    return stdout.trim() === "1";
  } catch (e) {
    return false;
  }
}
