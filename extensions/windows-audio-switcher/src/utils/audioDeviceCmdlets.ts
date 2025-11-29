import { runPowerShellScript } from "@raycast/utils";

export interface AudioDevice {
  ID: string;
  Index: number;
  Name: string;
  Default: boolean;
  Type: "Playback" | "Recording";
  DefaultCommunication?: boolean;
}

export interface AudioDeviceStatus {
  Volume?: number;
  Muted?: boolean;
}

/**
 * Executes a PowerShell script with AudioDeviceCmdlets
 * @param script The PowerShell script to execute
 * @param timeout Timeout in milliseconds
 * @returns Promise with stdout
 */
async function executePowerShellScript(script: string, timeout = 25000) {
  try {
    const fullScript = `
      try {
        Import-Module AudioDeviceCmdlets -ErrorAction SilentlyContinue
        if (-not (Get-Module -ListAvailable -Name AudioDeviceCmdlets)) {
          Install-Module -Name AudioDeviceCmdlets -Force -Scope CurrentUser
        }
        Import-Module AudioDeviceCmdlets

        ${script}
      } catch {
        Write-Host "Error: $_"
        exit 1
      }
    `;

    const stdout = await runPowerShellScript(fullScript, { timeout });
    return { stdout, stderr: "" };
  } catch (error) {
    throw new Error(`PowerShell execution failed: ${error}`);
  }
}

/**
 * Gets all audio devices
 * @returns Promise<AudioDevice[]>
 */
export async function getAllAudioDevices(): Promise<AudioDevice[]> {
  try {
    const script = `
# Get default devices for comparison
$defaultPlayback = Get-AudioDevice -Playback
$defaultPlaybackComm = Get-AudioDevice -PlaybackCommunication
$defaultRecording = Get-AudioDevice -Recording
$defaultRecordingComm = Get-AudioDevice -RecordingCommunication

# Get all audio devices
$allDevices = Get-AudioDevice -List

# Process and categorize devices
$result = $allDevices | Sort-Object -Property Name | ForEach-Object {
    $isDefault = $false
    $isDefaultComm = $false

    if ($_.ID -eq $defaultPlayback.ID -or $_.ID -eq $defaultRecording.ID) {
        $isDefault = $true
    }

    if ($_.ID -eq $defaultPlaybackComm.ID -or $_.ID -eq $defaultRecordingComm.ID) {
        $isDefaultComm = $true
    }

    [PSCustomObject]@{
        ID      = $_.ID
        Index   = $_.Index
        Name    = $_.Name
        Default = $isDefault
        DefaultCommunication = $isDefaultComm
        Type    = $_.Type
    }
}

$result | ConvertTo-Json -Compress
`;

    const { stdout } = await executePowerShellScript(script, 25000);
    const trimmed = stdout.trim();

    if (!trimmed || trimmed === "[]") {
      return [];
    }

    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error("Error getting audio devices:", error);
    throw error;
  }
}

/**
 * Sets an audio device as default
 * @param deviceId The ID of the device to set as default
 * @param setAsDefaultOnly Whether to set as default device only
 * @param setAsCommunicationOnly Whether to set as communication device only
 * @returns Promise<boolean> indicating success
 */
export async function setDefaultAudioDevice(
  deviceId: string,
  setAsDefaultOnly = false,
  setAsCommunicationOnly = false,
): Promise<boolean> {
  try {
    let switchCommand = `Set-AudioDevice -ID "${deviceId}"`;

    if (setAsDefaultOnly && !setAsCommunicationOnly) {
      switchCommand += " -DefaultOnly";
    } else if (setAsCommunicationOnly && !setAsDefaultOnly) {
      switchCommand += " -CommunicationOnly";
    }

    const script = `
${switchCommand}
Write-Host "Success: Switched to device ${deviceId}"
`;

    const { stdout } = await executePowerShellScript(script);
    return stdout.includes("Success");
  } catch (error) {
    console.error("Error setting default audio device:", error);
    return false;
  }
}

/**
 * Gets the status of an audio device (volume and mute state)
 * @param deviceId The ID of the device
 * @returns Promise<AudioDeviceStatus|null>
 */
export async function getAudioDeviceStatus(deviceId: string): Promise<AudioDeviceStatus | null> {
  try {
    const script = `
$device = Get-AudioDevice -ID "${deviceId}"
if ($device) {
  # Check if this is the default device to get its volume/mute status
  $defaultPlayback = Get-AudioDevice -Playback
  $isDefaultPlayback = ($device.ID -eq $defaultPlayback.ID)

  $volume = 0
  $muted = $false

  if ($isDefaultPlayback) {
    $volume = Get-AudioDevice -PlaybackVolume
    $muted = Get-AudioDevice -PlaybackMute
  } else {
    # For non-default devices, we can't directly get volume/mute
    # Set default values
    $volume = 50
    $muted = $false
  }

  [PSCustomObject]@{
    Volume = [int]$volume
    Muted = [bool]$muted
  } | ConvertTo-Json
}
`;

    const { stdout } = await executePowerShellScript(script);
    if (stdout.trim()) {
      return JSON.parse(stdout.trim());
    }
    return null;
  } catch (error) {
    console.error("Error getting device status:", error);
    return null;
  }
}

/**
 * Toggles the mute state of the default playback device
 * @returns Promise<boolean> indicating success
 */
export async function toggleMute(): Promise<boolean> {
  try {
    const script = `
Set-AudioDevice -PlaybackMuteToggle
Write-Host "Success: Toggled mute"
`;

    const { stdout } = await executePowerShellScript(script);
    return stdout.includes("Success");
  } catch (error) {
    console.error("Error toggling mute:", error);
    return false;
  }
}

/**
 * Sets the mute state of the default playback device
 * @param muted Whether to mute or unmute
 * @returns Promise<boolean> indicating success
 */
export async function setMute(muted: boolean): Promise<boolean> {
  try {
    const script = `
Set-AudioDevice -PlaybackMute ${muted}
Write-Host "Success: Set mute to ${muted}"
`;

    const { stdout } = await executePowerShellScript(script);
    return stdout.includes("Success");
  } catch (error) {
    console.error("Error setting mute:", error);
    return false;
  }
}

/**
 * Sets the volume of the default playback device
 * @param volume Volume level (0-100)
 * @returns Promise<boolean> indicating success
 */
export async function setVolume(volume: number): Promise<boolean> {
  try {
    const script = `
Set-AudioDevice -PlaybackVolume ${volume}
Write-Host "Success: Set volume to ${volume}"
`;

    const { stdout } = await executePowerShellScript(script);
    return stdout.includes("Success");
  } catch (error) {
    console.error("Error setting volume:", error);
    return false;
  }
}

/**
 * Gets the volume of the default playback device
 * @returns Promise<number> Volume level (0-100)
 */
export async function getVolume(): Promise<number> {
  try {
    const script = `
Get-AudioDevice -PlaybackVolume
`;

    const { stdout } = await executePowerShellScript(script);
    const volume = parseInt(stdout.trim());
    return isNaN(volume) ? 0 : volume;
  } catch (error) {
    console.error("Error getting volume:", error);
    return 0;
  }
}

/**
 * Gets the mute state of the default playback device
 * @returns Promise<boolean> Muted state
 */
export async function getMuteState(): Promise<boolean> {
  try {
    const script = `
Get-AudioDevice -PlaybackMute
`;

    const { stdout } = await executePowerShellScript(script);
    const muted = stdout.trim().toLowerCase() === "true";
    return muted;
  } catch (error) {
    console.error("Error getting mute state:", error);
    return false;
  }
}
