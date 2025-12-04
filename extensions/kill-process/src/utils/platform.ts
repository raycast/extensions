import { Image } from "@raycast/api";
import { Process } from "../types";

/**
 * Platform detection
 */
export const platform = process.platform;
export const isMac = platform === "darwin";
export const isWindows = platform === "win32";

/**
 * Encode a PowerShell script to Base64 for safe execution via -EncodedCommand
 * This avoids shell escaping issues with special characters like $
 */
function encodePowerShellCommand(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

/**
 * Windows PowerShell script to quickly list all processes
 * Returns: pid, name, cpu (placeholder 0), mem (KB), path
 * Note: CPU is set to 0 here; actual CPU usage comes from getProcessPerformanceCommand()
 */
const WINDOWS_PROCESS_LIST_SCRIPT = `
$result = Get-Process | Where-Object { $_.Id -ne 0 } | ForEach-Object {
  [PSCustomObject]@{
    pid = $_.Id
    name = $_.ProcessName
    cpu = 0
    mem = [math]::Round($_.WorkingSet64 / 1KB, 0)
    path = if ($_.Path) { $_.Path } else { '' }
  }
}
$result | ConvertTo-Json -Compress
`;

/**
 * Windows PowerShell script to fetch CPU usage via WMI performance counters
 * This is slower but provides accurate real-time CPU percentage
 * Returns: pid, cpu (percentage normalized by core count)
 */
const WINDOWS_CPU_PERFORMANCE_SCRIPT = `
$cpuCores = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
$processes = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.IDProcess -ne 0 -and $_.Name -ne '_Total' -and $_.Name -ne 'Idle' }
$result = $processes | ForEach-Object {
  [PSCustomObject]@{
    pid = $_.IDProcess
    cpu = [math]::Round($_.PercentProcessorTime / $cpuCores, 1)
  }
}
$result | ConvertTo-Json -Compress
`;

/**
 * Get command to list all processes
 * - Windows: Uses Get-Process (fast, but CPU is placeholder)
 * - macOS: Uses ps command
 */
export function getProcessListCommand(): string {
  if (isWindows) {
    return `powershell -EncodedCommand ${encodePowerShellCommand(WINDOWS_PROCESS_LIST_SCRIPT)}`;
  }
  return "ps -eo pid,ppid,pcpu,rss,comm";
}

/**
 * Get command to fetch CPU performance data (Windows only)
 * Uses WMI which is slower but provides accurate real-time CPU usage
 */
export function getProcessPerformanceCommand(): string {
  if (isWindows) {
    return `powershell -EncodedCommand ${encodePowerShellCommand(WINDOWS_CPU_PERFORMANCE_SCRIPT)}`;
  }
  return "ps -eo pid,ppid,pcpu,rss,comm";
}

/**
 * Get command to kill a process
 */
export function getKillCommand(pid: number, force = false): string {
  if (isWindows) {
    return force ? `taskkill /F /PID ${pid}` : `taskkill /PID ${pid}`;
  }
  return force ? `sudo kill -9 ${pid}` : `kill -9 ${pid}`;
}

/**
 * Parse macOS ps command output line
 * Format: pid ppid cpu mem path
 */
export function parseProcessLine(line: string): Partial<Process> | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/(\d+)\s+(\d+)\s+(\d+[.|,]\d+)\s+(\d+)\s+(.*)/);
  if (!match) return null;

  const [, id, pid, cpu, mem, path] = match;
  return {
    id: parseInt(id),
    pid: parseInt(pid),
    cpu: parseFloat(cpu),
    mem: parseInt(mem),
    path,
    processName: path.match(/[^/]*$/)?.[0] ?? "",
  };
}

/**
 * Parse Windows process list JSON output
 */
export function parseWindowsProcesses(output: string): Partial<Process>[] {
  try {
    const data = JSON.parse(output);
    const processes = Array.isArray(data) ? data : [data];

    return processes.map((proc: { pid: number; name: string; cpu: number; mem: number; path: string }) => ({
      id: proc.pid,
      pid: 0,
      cpu: proc.cpu,
      mem: proc.mem,
      path: proc.path || "",
      processName: proc.name || "",
    }));
  } catch {
    console.error("Failed to parse Windows process output");
    return [];
  }
}

/**
 * Parse Windows CPU performance data JSON output
 * Returns map of process ID to CPU percentage
 */
export function parseWindowsPerformanceData(output: string): Map<number, number> {
  const cpuMap = new Map<number, number>();
  try {
    const data = JSON.parse(output);
    const processes = Array.isArray(data) ? data : [data];

    for (const proc of processes) {
      if (proc?.pid) {
        cpuMap.set(proc.pid, proc.cpu ?? 0);
      }
    }
  } catch {
    console.error("Failed to parse Windows performance output");
  }
  return cpuMap;
}

/**
 * Detect process type based on path
 */
export function getProcessType(path: string): Process["type"] {
  if (isMac) {
    if (path.includes(".prefPane")) return "prefPane";
    if (path.includes(".app/")) return "app";
    return "binary";
  }

  if (isWindows) {
    const lowerPath = path.toLowerCase();
    const isApp =
      lowerPath.endsWith(".exe") && (lowerPath.includes("program files") || lowerPath.includes("applications"));
    return isApp ? "app" : "binary";
  }

  return "binary";
}

/**
 * Extract application name from path
 */
export function getAppName(path: string, processName: string): string | undefined {
  if (isMac) {
    return path.match(/(?<=\/)[^/]+(?=\.app\/)/)?.[0];
  }
  if (isWindows) {
    return processName.replace(/\.exe$/i, "");
  }
  return processName;
}

/**
 * Get file icon for a process
 */
export function getFileIcon(process: Process): Image.ImageLike {
  if (isMac) {
    if (process.type === "prefPane") {
      return { fileIcon: process.path?.replace(/(.+\.prefPane)(.+)/, "$1") ?? "" };
    }
    if (process.type === "app" || process.type === "aggregatedApp") {
      return { fileIcon: process.path?.replace(/(.+\.app)(.+)/, "$1") ?? "" };
    }
    return "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ExecutableBinaryIcon.icns";
  }

  if (isWindows) {
    if (process.type === "app") {
      return { fileIcon: process.path };
    }
    return "🖥️";
  }

  return "⚙️";
}

/**
 * Get error help message for failed kill attempts
 */
export function getPlatformSpecificErrorHelp(isForceKill: boolean): {
  title: string;
  message?: string;
  helpUrl?: string;
} {
  if (isMac && isForceKill) {
    return {
      title: "Failed to Force Kill Process",
      message: "Please ensure that touch ID/password prompt is enabled for sudo",
      helpUrl: "https://dev.to/siddhantkcode/enable-touch-id-authentication-for-sudo-on-macos-sonoma-14x-4d28",
    };
  }

  if (isWindows && isForceKill) {
    return {
      title: "Failed to Force Kill Process",
      message: "Administrative privileges may be required. Try running as administrator.",
    };
  }

  return {
    title: "Failed to Kill Process",
    message: "The process could not be terminated. It may have already exited or require elevated privileges.",
  };
}
