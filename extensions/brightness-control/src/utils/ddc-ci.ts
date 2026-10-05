import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { nativeAdjustBrightness, nativeGetBrightness, nativeSetBrightness } from "./brightness-native";

const execFileAsync = promisify(execFile);

export interface MonitorResult {
  type: "wmi" | "ddc";
  index: number;
  description: string;
  brightness: number;
  maxBrightness: number;
  success: boolean;
  newBrightness?: number;
  setResult?: boolean;
}

interface ScriptResult {
  monitors: MonitorResult[];
  error: string | null;
}

const BRIGHTNESS_PS1 = `param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('get', 'set', 'offset')]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [int]$Value = 0,

    # Cache tag derived from the script source (passed by the caller).
    # The DDC wrapper DLL filename includes it, so a future script change
    # never reuses a DLL compiled from older sources.
    [Parameter(Mandatory=$false)]
    [string]$DllTag = "v1"
)

# DDC/CI interop compiled on first use and cached as a DLL in $env:TEMP
# (see the DDC block below) to avoid recompiling the C# on every call.
$DdcControlCode = @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class DdcControl {
    [DllImport("user32.dll")]
    public static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr lprcClip, MonitorEnumDelegate lpfnEnum, IntPtr dwData);

    [DllImport("dxva2.dll")]
    public static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, out uint count);

    [DllImport("dxva2.dll")]
    public static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, uint count, [Out] PHYSICAL_MONITOR[] monitors);

    [DllImport("dxva2.dll")]
    public static extern bool DestroyPhysicalMonitors(uint count, [In] PHYSICAL_MONITOR[] monitors);

    [DllImport("dxva2.dll")]
    public static extern bool SetVCPFeature(IntPtr hMonitor, byte vcpCode, uint newValue);

    [DllImport("dxva2.dll")]
    public static extern bool GetVCPFeatureAndVCPFeatureReply(IntPtr hMonitor, byte vcpCode, IntPtr pvct, out uint currentValue, out uint maxValue);

    public delegate bool MonitorEnumDelegate(IntPtr hMonitor, IntPtr hdcMonitor, ref RECT lprcMonitor, IntPtr dwData);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct PHYSICAL_MONITOR {
        public IntPtr hPhysicalMonitor;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string szPhysicalMonitorDescription;
    }

    public static List<IntPtr> MonitorHandles = new List<IntPtr>();

    public static bool MonitorEnumCallback(IntPtr hMonitor, IntPtr hdcMonitor, ref RECT lprcMonitor, IntPtr dwData) {
        MonitorHandles.Add(hMonitor);
        return true;
    }

    public static void EnumerateMonitors() {
        MonitorHandles.Clear();
        EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, MonitorEnumCallback, IntPtr.Zero);
    }
}
"@

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$brightnessCode = [byte]0x10
$results = @()
$idx = 0

try {
    # --- WMI: internal / laptop displays ---
    try {
        $wmiMonitors = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction Stop
        foreach ($mon in $wmiMonitors) {
            $entry = @{
                type = 'wmi'
                index = $idx
                description = $mon.InstanceName
                brightness = [int]$mon.CurrentBrightness
                maxBrightness = 100
                success = $true
            }

            if ($Action -in 'set', 'offset') {
                $newVal = if ($Action -eq 'set') {
                    [Math]::Max(0, [Math]::Min($Value, 100))
                } else {
                    [Math]::Max(0, [Math]::Min([int]$mon.CurrentBrightness + $Value, 100))
                }
                $methods = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods |
                    Where-Object { $_.InstanceName -eq $mon.InstanceName }
                if ($methods) {
                    $setSucceeded = $false
                    foreach ($method in $methods) {
                        $invokeResult = Invoke-CimMethod -InputObject $method -MethodName WmiSetBrightness -Arguments @{
                            Timeout = [uint32]1
                            Brightness = [byte]$newVal
                        } -ErrorAction Stop

                        if ($null -eq $invokeResult.ReturnValue -or [int]$invokeResult.ReturnValue -eq 0) {
                            $setSucceeded = $true
                        }
                    }

                    $entry['newBrightness'] = $newVal
                    $entry['setResult'] = $setSucceeded
                } else {
                    $entry['setResult'] = $false
                }
            }

            $results += $entry
            $idx++
        }
    } catch {
        # No WMI brightness support (desktop PC) - continue to DDC/CI
    }

    # --- DDC/CI: external displays ---
    try {
        # Loading a cached wrapper DLL (~50ms) is far cheaper than compiling
        # the C# on every invocation (~1s). Best-effort: any failure falls
        # back to compiling in-memory. The filename carries the caller-passed
        # source tag, so a script update never loads a stale DLL.
        $ddcDll = Join-Path $env:TEMP "brightness-control-ddc-$DllTag.dll"
        $ddcLoaded = $false
        try {
            if (Test-Path $ddcDll) {
                Add-Type -Path $ddcDll -ErrorAction Stop
                $ddcLoaded = $true
            }
        } catch { }
        if (-not $ddcLoaded) {
            try {
                Add-Type $DdcControlCode -OutputAssembly $ddcDll -OutputType Library -ErrorAction Stop
            } catch {
                Add-Type $DdcControlCode -ErrorAction Stop
            }
        }
        [DdcControl]::EnumerateMonitors()

        foreach ($hMonitor in [DdcControl]::MonitorHandles) {
            $count = [uint32]0
            if (-not [DdcControl]::GetNumberOfPhysicalMonitorsFromHMONITOR($hMonitor, [ref]$count)) { continue }
            if ($count -eq 0) { continue }

            $physicalMonitors = New-Object DdcControl+PHYSICAL_MONITOR[] $count
            if (-not [DdcControl]::GetPhysicalMonitorsFromHMONITOR($hMonitor, $count, $physicalMonitors)) {
                continue
            }

            for ($i = 0; $i -lt $count; $i++) {
                $handle = $physicalMonitors[$i].hPhysicalMonitor
                $desc = $physicalMonitors[$i].szPhysicalMonitorDescription

                $current = [uint32]0
                $max = [uint32]0
                $getResult = [DdcControl]::GetVCPFeatureAndVCPFeatureReply($handle, $brightnessCode, [IntPtr]::Zero, [ref]$current, [ref]$max)

                if (-not $getResult) { continue }

                $entry = @{
                    type = 'ddc'
                    index = $idx
                    description = $desc
                    brightness = [int]$current
                    maxBrightness = [int]$max
                    success = $getResult
                }

                if ($Action -in 'set', 'offset') {
                    $newVal = if ($Action -eq 'set') {
                        [Math]::Max(0, [Math]::Min($Value, [int]$max))
                    } else {
                        [Math]::Max(0, [Math]::Min([int]$current + $Value, [int]$max))
                    }
                    $setResult = [DdcControl]::SetVCPFeature($handle, $brightnessCode, [uint32]$newVal)
                    $entry['newBrightness'] = $newVal
                    $entry['setResult'] = $setResult
                }

                $results += $entry
                $idx++
            }

            [DdcControl]::DestroyPhysicalMonitors($count, $physicalMonitors) | Out-Null
        }
    } catch {
        # DDC/CI not available - continue silently
    }

    $output = @{ monitors = $results; error = $null }
    Write-Output ($output | ConvertTo-Json -Depth 3 -Compress)
}
catch {
    $output = @{ monitors = @(); error = $_.Exception.Message }
    Write-Output ($output | ConvertTo-Json -Depth 3 -Compress)
    exit 1
}
`;

function getScriptPath(): string {
  return join(tmpdir(), "brightness-control-ddc.ps1");
}

function ensureScript(): string {
  const path = getScriptPath();
  try {
    // The script is identical on every call — only write it once.
    if (existsSync(path) && readFileSync(path, "utf-8") === BRIGHTNESS_PS1) {
      return path;
    }
  } catch {
    // Unreadable temp file: fall through and rewrite it.
  }
  writeFileSync(path, BRIGHTNESS_PS1, "utf-8");
  return path;
}

function powershellCandidates(): string[] {
  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  return ["powershell.exe", `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`];
}

/**
 * Short tag derived from the script source, passed as `-DllTag` so the
 * cached DDC wrapper DLL filename changes whenever the script does.
 * A stale DLL from an older release can never be reused.
 */
function scriptTag(): string {
  let hash = 5381;
  for (let i = 0; i < BRIGHTNESS_PS1.length; i++) {
    hash = ((hash * 33) ^ BRIGHTNESS_PS1.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

async function runBrightnessScript(action: "get" | "set" | "offset", value: number = 0): Promise<ScriptResult> {
  const scriptPath = ensureScript();
  const args = [
    "-ExecutionPolicy",
    "Bypass",
    "-NoProfile",
    "-NonInteractive",
    "-File",
    scriptPath,
    "-Action",
    action,
    "-Value",
    String(value),
    "-DllTag",
    scriptTag(),
  ];

  let stdout: string | null = null;
  let lastError: unknown = null;
  for (const powershell of powershellCandidates()) {
    try {
      // execFile (no cmd.exe layer) is measurably faster than exec + string command.
      const result = await execFileAsync(powershell, args, { timeout: 15000, encoding: "utf8" });
      stdout = result.stdout;
      lastError = null;
      break;
    } catch (err: unknown) {
      lastError = err;
      const code = (err as { code?: string }).code;
      // Missing binary on PATH: try the absolute System32 path next.
      if (code === "ENOENT") continue;
      break;
    }
  }
  if (stdout === null) {
    // The script can exit non-zero while still printing JSON to stdout —
    // recover that payload when possible before reporting failure.
    const execErr = lastError as { stdout?: string; stderr?: string; message?: string } | null;
    const raw = (execErr?.stdout || "").trim().replace(/^\uFEFF/, "");
    if (raw) {
      try {
        const parsed: ScriptResult = JSON.parse(raw);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        return parsed;
      } catch {
        // not valid JSON, fall through
      }
    }
    const detail = execErr?.stderr || (lastError as Error)?.message || String(lastError);
    throw new Error(`Brightness script failed: ${detail}`);
  }

  const jsonStr = stdout.trim().replace(/^\uFEFF/, "");
  const result: ScriptResult = JSON.parse(jsonStr);

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

export async function getBrightness(): Promise<MonitorResult[]> {
  const native = await nativeGetBrightness();
  if (native) return native;
  const result = await runBrightnessScript("get");
  return result.monitors;
}

export async function setBrightness(level: number): Promise<MonitorResult[]> {
  const native = await nativeSetBrightness(level);
  if (native) return native;
  const result = await runBrightnessScript("set", level);
  return result.monitors;
}

export async function adjustBrightness(offset: number): Promise<MonitorResult[]> {
  const native = await nativeAdjustBrightness(offset);
  if (native) return native;
  const result = await runBrightnessScript("offset", offset);
  return result.monitors;
}
