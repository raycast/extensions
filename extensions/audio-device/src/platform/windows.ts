import { execa } from "execa";
import { showToast, Toast } from "@raycast/api";
import type { PlatformAudioAPI, AudioDevice } from "./index";

interface WindowsAudioDevice {
  ID: string;
  Name: string;
  Type: string;
  Index: number;
  Default: boolean;
  DefaultComm: boolean;
  State: string;
}

async function runPowerShell(command: string): Promise<string> {
  try {
    const { stdout } = await execa("powershell", ["-NoProfile", "-Command", command]);
    return stdout;
  } catch (error) {
    const errorMessage =
      (error as { stderr?: string; message?: string }).stderr ||
      (error as Error).message ||
      "PowerShell command failed";
    throw new Error(errorMessage);
  }
}

async function ensureAudioModule(): Promise<void> {
  try {
    await runPowerShell("Get-Module -ListAvailable -Name AudioDeviceCmdlets");
  } catch {
    showToast({
      style: Toast.Style.Animated,
      title: "Installing AudioDeviceCmdlets",
      message: "This may take a moment...",
    });

    try {
      await runPowerShell("Install-Module -Name AudioDeviceCmdlets -Scope CurrentUser -Force -SkipPublisherCheck");
      showToast({
        style: Toast.Style.Success,
        title: "AudioDeviceCmdlets Installed",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Installation Failed",
        message:
          "Please install AudioDeviceCmdlets manually: Install-Module -Name AudioDeviceCmdlets -Scope CurrentUser",
      });
      throw error;
    }
  }
}

async function getDevices(type?: "Playback" | "Recording"): Promise<WindowsAudioDevice[]> {
  await ensureAudioModule();

  let command = "Get-AudioDevice -List";
  if (type) {
    command = `Get-AudioDevice -List | Where-Object { $_.Type -eq '${type}' }`;
  }

  const result = await runPowerShell(`(${command} | ConvertTo-Json -Depth 3)`);
  const devices: WindowsAudioDevice[] = JSON.parse(result);

  if (!Array.isArray(devices)) {
    return [devices];
  }

  return devices;
}

function mapToDevice(windowsDevice: WindowsAudioDevice, type: "input" | "output"): AudioDevice {
  return {
    id: windowsDevice.ID,
    uid: windowsDevice.ID,
    name: windowsDevice.Name,
    isInput: type === "input",
    isOutput: type === "output",
    transportType: mapTransportType(windowsDevice.Name),
    index: windowsDevice.Index,
    isDefault: windowsDevice.Default,
    isCommunication: windowsDevice.DefaultComm,
  };
}

function mapTransportType(deviceName: string): string {
  const typeMap: Record<string, string> = {
    // More specific multi-word patterns first
    "realtek digital": "spdif",
    "digital output": "spdif",
    "steam streaming": "virtual",
    nvidia: "hdmi",
    // Then device types
    headphones: "headphones",
    headset: "headphones",
    earbuds: "headphones",
    airpods: "headphones",
    microphone: "microphone",
    speakers: "speakers",
    // Then shorter patterns
    hdmi: "hdmi",
    displayport: "displayport",
    usb: "usb",
    bluetooth: "bluetooth",
    mic: "microphone",
    speaker: "speakers",
    spdif: "spdif",
    optical: "spdif",
    dp: "displayport",
    virtual: "virtual",
  };

  const lowerName = deviceName.toLowerCase();
  for (const [key, value] of Object.entries(typeMap)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }

  return "speakers";
}

async function setDefault(deviceId: string, type: "input" | "output", communication = false): Promise<void> {
  await ensureAudioModule();

  const setCommand = `Set-AudioDevice -ID ([System.Security.SecurityElement]::Escape('${deviceId}')) ${communication ? "-CommunicationOnly" : "-DefaultOnly"}`;

  await runPowerShell(setCommand);
}

export const windowsAudioAPI: PlatformAudioAPI = {
  async getAllDevices(): Promise<AudioDevice[]> {
    const playbackDevices = await getDevices("Playback");
    const recordingDevices = await getDevices("Recording");

    const outputDevices = playbackDevices.map((d) => mapToDevice(d, "output"));
    const inputDevices = recordingDevices.map((d) => mapToDevice(d, "input"));

    return [...outputDevices, ...inputDevices];
  },

  async getInputDevices(): Promise<AudioDevice[]> {
    const devices = await getDevices("Recording");
    return devices.map((d) => mapToDevice(d, "input"));
  },

  async getOutputDevices(): Promise<AudioDevice[]> {
    const devices = await getDevices("Playback");
    return devices.map((d) => mapToDevice(d, "output"));
  },

  async getDefaultOutputDevice(): Promise<AudioDevice> {
    await ensureAudioModule();
    const command = "Get-AudioDevice -List | Where-Object { $_.Type -eq 'Playback' -and $_.Default -eq $true }";
    const result = await runPowerShell(`(${command} | ConvertTo-Json)`);

    if (!result || result.trim() === "" || result === "null") {
      throw new Error("No default output device found");
    }

    const device: WindowsAudioDevice = JSON.parse(result);
    if (!device || !device.ID) {
      throw new Error("No valid default output device found");
    }

    return mapToDevice(device, "output");
  },

  async getDefaultInputDevice(): Promise<AudioDevice> {
    await ensureAudioModule();
    const command = "Get-AudioDevice -List | Where-Object { $_.Type -eq 'Recording' -and $_.Default -eq $true }";
    const result = await runPowerShell(`(${command} | ConvertTo-Json)`);

    if (!result || result.trim() === "" || result === "null") {
      throw new Error("No default input device found");
    }

    const device: WindowsAudioDevice = JSON.parse(result);
    if (!device || !device.ID) {
      throw new Error("No valid default input device found");
    }

    return mapToDevice(device, "input");
  },

  async setDefaultOutputDevice(deviceId: string) {
    await setDefault(deviceId, "output", false);
  },

  async setDefaultInputDevice(deviceId: string) {
    await setDefault(deviceId, "input", false);
  },

  async setDefaultCommunicationOutputDevice(deviceId: string) {
    await setDefault(deviceId, "output", true);
  },

  async setDefaultCommunicationInputDevice(deviceId: string) {
    await setDefault(deviceId, "input", true);
  },

  async getOutputDeviceVolume() {
    return undefined;
  },

  async setOutputDeviceVolume() {
    // Volume control not yet implemented for Windows
    return Promise.resolve();
  },
};
