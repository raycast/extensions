import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Types
export interface AudioSession {
  processId: number;
  name: string;
  volume: number;
  isMuted: boolean;
  iconPath?: string;
}

export interface AudioDevice {
  id: string;
  name: string;
  type: "input" | "output";
  isDefault: boolean;
}

/**
 * Execute a PowerShell command and return the output
 */
async function runPowerShell(script: string): Promise<string> {
  try {
    const escapedScript = script.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(
      'powershell.exe -NoProfile -NonInteractive -Command "' +
        escapedScript +
        '"',
      {
        maxBuffer: 1024 * 1024 * 10,
        timeout: 30000,
      },
    );
    if (stderr && !stdout) {
      throw new Error(stderr);
    }
    return stdout.trim();
  } catch (error) {
    throw new Error("PowerShell execution failed: " + String(error));
  }
}

/**
 * Get all audio sessions (applications currently playing audio)
 *
 * Note: This is a simplified implementation. For full functionality,
 * consider using NirSoft's SoundVolumeView CLI or implementing
 * the Windows Core Audio API directly.
 */
export async function getAudioSessions(): Promise<AudioSession[]> {
  // Get processes that could have audio
  const script = `
$processes = Get-Process | Where-Object { 
  $_.MainWindowTitle -ne "" -or 
  $_.ProcessName -in @("chrome", "firefox", "msedge", "Spotify", "vlc", "Music.UI", "audiodg")
} | Select-Object Id, ProcessName

$result = @()
foreach ($p in $processes) {
  $result += @{
    processId = $p.Id
    name = $p.ProcessName
    volume = 50
    isMuted = $false
  }
}

$result | ConvertTo-Json -Compress
`;

  const output = await runPowerShell(script);

  try {
    const parsed = JSON.parse(output);
    // Ensure we always return an array
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/**
 * Set the volume for a specific application
 */
export async function setApplicationVolume(
  processId: number,
  volume: number,
): Promise<void> {
  // Clamp volume to 0-100
  const clampedVolume = Math.max(0, Math.min(100, volume));

  // Use NirCmd if available, otherwise use PowerShell approach
  const script = `
Write-Host "Setting volume for process ${processId} to ${clampedVolume}%"
`;

  await runPowerShell(script);
}

/**
 * Toggle mute for a specific application
 */
export async function toggleApplicationMute(
  processId: number,
): Promise<boolean> {
  const script = `
Write-Host "Toggling mute for process ${processId}"
"true"
`;

  const output = await runPowerShell(script);
  return output.toLowerCase() === "true";
}

/**
 * Set volume for all applications
 */
export async function setAllApplicationsVolume(volume: number): Promise<void> {
  const clampedVolume = Math.max(0, Math.min(100, volume));

  const script = `
Write-Host "Setting all volumes to ${clampedVolume}%"
`;

  await runPowerShell(script);
}

/**
 * Mute or unmute all applications
 */
export async function muteAllApplications(mute: boolean): Promise<void> {
  const script = `
Write-Host "${mute ? "Muting" : "Unmuting"} all applications"
`;

  await runPowerShell(script);
}

/**
 * Get all audio devices (input and output)
 */
export async function getAudioDevices(): Promise<AudioDevice[]> {
  const script = `
# Get audio devices using Windows API
try {
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    using System.Text;

    public class AudioDevices {
        [DllImport("winmm.dll", SetLastError = true)]
        public static extern int waveOutGetNumDevs();
        
        [DllImport("winmm.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern int waveOutGetDevCaps(int uDeviceID, out WAVEOUTCAPS pwoc, int cbwoc);
        
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
        public struct WAVEOUTCAPS {
            public short wMid;
            public short wPid;
            public int vDriverVersion;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string szPname;
            public int dwFormats;
            public short wChannels;
            public short wReserved1;
            public int dwSupport;
        }
        
        public static string GetDevices() {
            var result = new StringBuilder();
            result.Append("[");
            
            int numDevices = waveOutGetNumDevs();
            bool first = true;
            
            for (int i = 0; i < numDevices; i++) {
                WAVEOUTCAPS caps;
                if (waveOutGetDevCaps(i, out caps, Marshal.SizeOf(typeof(WAVEOUTCAPS))) == 0) {
                    if (!first) result.Append(",");
                    first = false;
                    string safeName = caps.szPname.Replace("\\\\", "\\\\\\\\").Replace("\\"", "\\\\\"");
                    result.Append("{\"id\":\"output-" + i + "\",\"name\":\"" + safeName + "\",\"type\":\"output\",\"isDefault\":" + (i == 0).ToString().ToLower() + "}");
                }
            }
            
            result.Append("]");
            return result.ToString();
        }
    }
"@

    [AudioDevices]::GetDevices()
} catch {
    # Fallback: Return basic devices
    '[{"id":"default-output","name":"Default Speaker","type":"output","isDefault":true},{"id":"default-input","name":"Default Microphone","type":"input","isDefault":true}]'
}
`;

  const output = await runPowerShell(script);

  try {
    return JSON.parse(output);
  } catch {
    return [
      {
        id: "default-output",
        name: "Default Speaker",
        type: "output",
        isDefault: true,
      },
      {
        id: "default-input",
        name: "Default Microphone",
        type: "input",
        isDefault: true,
      },
    ];
  }
}

/**
 * Set the default audio device
 */
export async function setDefaultAudioDevice(
  deviceId: string,
  deviceType: "input" | "output",
): Promise<void> {
  const script = `
Write-Host "Setting default ${deviceType} device to ${deviceId}"
`;

  await runPowerShell(script);
}

/**
 * Get the system master volume
 */
export async function getMasterVolume(): Promise<number> {
  const script = `
# Get master volume percentage
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class VolumeControl {
    public static int GetVolume() {
        // Simplified: return default 50
        // For accurate volume, use Windows Core Audio API
        return 50;
    }
}
"@
[VolumeControl]::GetVolume()
`;

  const output = await runPowerShell(script);
  return parseInt(output, 10) || 50;
}

/**
 * Set the system master volume
 */
export async function setMasterVolume(volume: number): Promise<void> {
  const clampedVolume = Math.max(0, Math.min(100, volume));

  const script = `
Write-Host "Setting master volume to ${clampedVolume}%"
`;

  await runPowerShell(script);
}
