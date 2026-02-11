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

let resolvedShell: string | null = null;

async function getPowerShellExe(): Promise<string> {
  if (resolvedShell) return resolvedShell;

  try {
    await execa("pwsh", ["-NoProfile", "-Command", "exit 0"]);
    resolvedShell = "pwsh";
  } catch {
    resolvedShell = "powershell";
  }
  return resolvedShell;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, "");
}

async function runPowerShell(command: string): Promise<string> {
  const shell = await getPowerShellExe();
  try {
    const { stdout } = await execa(shell, ["-NoProfile", "-Command", command]);
    return stripAnsi(stdout);
  } catch (error) {
    const errorMessage =
      (error as { stderr?: string; message?: string }).stderr ||
      (error as Error).message ||
      "PowerShell command failed";
    console.error("PowerShell command failed", { command, errorMessage });
    throw new Error(errorMessage);
  }
}

let ensureModulePromise: Promise<void> | null = null;

function ensureAudioModule(): Promise<void> {
  if (!ensureModulePromise) {
    ensureModulePromise = doEnsureAudioModule().catch((err) => {
      ensureModulePromise = null;
      throw err;
    });
  }
  return ensureModulePromise;
}

async function doEnsureAudioModule(): Promise<void> {
  let moduleAvailable = false;
  try {
    const result = await runPowerShell(
      "Get-Module -ListAvailable -Name AudioDeviceCmdlets | Select-Object -First 1 | ConvertTo-Json",
    );
    moduleAvailable = !!(result && result.trim() !== "" && result.trim() !== "null");
  } catch {
    moduleAvailable = false;
  }

  if (moduleAvailable) {
    return;
  }

  showToast({
    style: Toast.Style.Animated,
    title: "Installing AudioDeviceCmdlets",
    message: "This may take a moment...",
  });

  try {
    const shell = await getPowerShellExe();
    const installCmd =
      shell === "pwsh"
        ? "Install-PSResource -Name AudioDeviceCmdlets -Scope CurrentUser -TrustRepository -Quiet *>&1 | Out-String"
        : "Set-PSRepository -Name PSGallery -InstallationPolicy Trusted; Install-Module -Name AudioDeviceCmdlets -Scope CurrentUser -Force -SkipPublisherCheck *>&1 | Out-String";
    const installOutput = await runPowerShell(installCmd);
    if (installOutput && installOutput.trim()) {
      console.log("Install-Module output:", installOutput);
    }

    const checkResult = await runPowerShell(
      "Get-Module -ListAvailable -Name AudioDeviceCmdlets | Select-Object -First 1 | ConvertTo-Json",
    );

    if (!checkResult || checkResult.trim() === "" || checkResult.trim() === "null") {
      const modulePath = await runPowerShell("$env:PSModulePath");
      const errorDetail = `Module not found after install. PSModulePath: ${modulePath}`;
      console.error("AudioDeviceCmdlets missing after install", { modulePath, installOutput });
      showToast({
        style: Toast.Style.Failure,
        title: "AudioDeviceCmdlets Install Failed",
        message: errorDetail,
      });
      throw new Error(errorDetail);
    }

    showToast({
      style: Toast.Style.Success,
      title: "AudioDeviceCmdlets Installed",
    });
  } catch (error) {
    const msg = (error as Error).message || "Unknown error";
    console.error("AudioDeviceCmdlets install failed", msg);
    showToast({
      style: Toast.Style.Failure,
      title: "Installation Failed",
      message: msg,
    });
    throw error;
  }
}

function buildAudioModuleCommand(command: string) {
  return `$WarningPreference = 'SilentlyContinue'; Import-Module AudioDeviceCmdlets -ErrorAction Stop -WarningAction SilentlyContinue; ${command}`;
}

async function getDevices(type?: "Playback" | "Recording"): Promise<WindowsAudioDevice[]> {
  await ensureAudioModule();

  let command = "Get-AudioDevice -List";
  if (type) {
    command = `Get-AudioDevice -List | Where-Object { $_.Type -eq '${type}' }`;
  }

  const result = await runPowerShell(buildAudioModuleCommand(`(${command} | ConvertTo-Json -Depth 3)`));
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

  const safeId = deviceId.replace(/'/g, "''");
  const setCommand = `Set-AudioDevice -ID '${safeId}' ${communication ? "-CommunicationOnly" : "-DefaultOnly"}`;

  await runPowerShell(buildAudioModuleCommand(setCommand));
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
    const result = await runPowerShell(buildAudioModuleCommand(`(${command} | ConvertTo-Json)`));

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
    const result = await runPowerShell(buildAudioModuleCommand(`(${command} | ConvertTo-Json)`));

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
