import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

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
    [int]$Value = 0
)

Add-Type @"
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
  writeFileSync(path, BRIGHTNESS_PS1, "utf-8");
  return path;
}

async function runBrightnessScript(action: "get" | "set" | "offset", value: number = 0): Promise<ScriptResult> {
  const scriptPath = ensureScript();

  let stdout: string;
  try {
    const result = await execAsync(
      `powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "${scriptPath}" -Action ${action} -Value ${value}`,
      { timeout: 15000, encoding: "utf8" },
    );
    stdout = result.stdout;
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string };
    const raw = (execErr.stdout || "").trim().replace(/^\uFEFF/, "");
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
    const detail = execErr.stderr || execErr.message || String(err);
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
  const result = await runBrightnessScript("get");
  return result.monitors;
}

export async function setBrightness(level: number): Promise<MonitorResult[]> {
  const result = await runBrightnessScript("set", level);
  return result.monitors;
}

export async function adjustBrightness(offset: number): Promise<MonitorResult[]> {
  const result = await runBrightnessScript("offset", offset);
  return result.monitors;
}
