import path from "path";
import fs from "fs";
import { execa } from "execa";
import { environment } from "@raycast/api";
import type { PlatformAudioAPI, AudioDevice } from "./index";

type WindowsAudioDevice = {
  id: string;
  name: string;
  isDefault?: boolean;
  isDefaultCom?: boolean;
};

type WindowsAudioList = {
  inputs: WindowsAudioDevice[];
  outputs: WindowsAudioDevice[];
};

type WindowsAudioSwitchResult = {
  type: "input" | "output";
  device: WindowsAudioDevice;
};

const binaryAsset = path.join(environment.assetsPath, "win-audio-cli.exe");
const binary = path.join(environment.supportPath, "win-audio-cli.exe");
let hasLoggedBinaryInfo = false;

async function ensureBinary() {
  const shouldCopy = !fs.existsSync(binary);
  if (shouldCopy) {
    fs.copyFileSync(binaryAsset, binary);
    await logBinaryInfo();
    return;
  }

  try {
    const assetStat = fs.statSync(binaryAsset);
    const binaryStat = fs.statSync(binary);
    if (assetStat.mtimeMs > binaryStat.mtimeMs) {
      fs.copyFileSync(binaryAsset, binary);
      await logBinaryInfo();
      return;
    }
  } catch (error) {
    console.warn("Failed to sync Windows audio binary", error);
  }

  await logBinaryInfo();
}

async function logBinaryInfo() {
  if (hasLoggedBinaryInfo) {
    return;
  }
  hasLoggedBinaryInfo = true;

  try {
    const { stdout } = await execa(binary, ["version"]);
    const info = parseJson<{ version: string; commit: string; buildDate: string }>(stdout);
    console.log("Windows audio binary", {
      path: binary,
      version: info.version,
      commit: info.commit,
      buildDate: info.buildDate,
    });
  } catch (error) {
    console.warn("Failed to read Windows audio binary version", error);
  }
}

function parseJson<T>(stdout: string): T {
  return JSON.parse(stdout) as T;
}

function mapToDevice(device: WindowsAudioDevice, type: "input" | "output"): AudioDevice {
  return {
    id: device.id,
    uid: device.id,
    name: device.name,
    isInput: type === "input",
    isOutput: type === "output",
    transportType: mapTransportType(device.name),
    isDefault: device.isDefault,
    isCommunication: device.isDefaultCom,
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

async function runBinary<T>(args: string[]): Promise<T> {
  await ensureBinary();
  const { stdout } = await execa(binary, args);
  return parseJson<T>(stdout);
}

async function getDevices(): Promise<WindowsAudioList> {
  return runBinary<WindowsAudioList>(["list", "--json"]);
}

export const windowsAudioAPI: PlatformAudioAPI = {
  async getAllDevices(): Promise<AudioDevice[]> {
    const devices = await getDevices();
    return [
      ...devices.outputs.map((device) => mapToDevice(device, "output")),
      ...devices.inputs.map((device) => mapToDevice(device, "input")),
    ];
  },

  async getInputDevices(): Promise<AudioDevice[]> {
    const devices = await getDevices();
    return devices.inputs.map((device) => mapToDevice(device, "input"));
  },

  async getOutputDevices(): Promise<AudioDevice[]> {
    const devices = await getDevices();
    return devices.outputs.map((device) => mapToDevice(device, "output"));
  },

  async getDefaultOutputDevice(): Promise<AudioDevice> {
    const devices = await getDevices();
    const device = devices.outputs.find((output) => output.isDefault);
    if (!device) {
      throw new Error("No default output device found");
    }

    return mapToDevice(device, "output");
  },

  async getDefaultInputDevice(): Promise<AudioDevice> {
    const devices = await getDevices();
    const device = devices.inputs.find((input) => input.isDefault);
    if (!device) {
      throw new Error("No default input device found");
    }

    return mapToDevice(device, "input");
  },

  async setDefaultOutputDevice(deviceId: string) {
    await runBinary<WindowsAudioSwitchResult>(["switch-output", "--id", deviceId]);
  },

  async setDefaultInputDevice(deviceId: string) {
    await runBinary<WindowsAudioSwitchResult>(["switch-input", "--id", deviceId]);
  },

  async setDefaultCommunicationOutputDevice(deviceId: string) {
    await runBinary<WindowsAudioSwitchResult>(["switch-output-communication", "--id", deviceId]);
  },

  async setDefaultCommunicationInputDevice(deviceId: string) {
    await runBinary<WindowsAudioSwitchResult>(["switch-input-communication", "--id", deviceId]);
  },
};
