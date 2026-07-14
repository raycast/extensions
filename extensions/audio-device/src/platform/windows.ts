import path from "path";
import fs from "fs";
import https from "https";
import crypto from "crypto";
import { execa } from "execa";
import { environment, showToast, Toast } from "@raycast/api";
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

type WindowsAudioVolumeResult = {
  type: "input" | "output";
  volume: number;
  device: WindowsAudioDevice;
};

const WINDOWS_BINARY_URL = "https://github.com/Inovvia/go-win-audio-cli/releases/download/1.3.1/win-audio-cli.exe";
const WINDOWS_BINARY_CHECKSUM = "9bda285caea2477f5504a73b532d4102e5d8e37a63c16669faca1834ccfd2048";

const binary = path.join(environment.supportPath, "win-audio-cli.exe");
const binaryDownload = path.join(environment.supportPath, `win-audio-cli.${process.pid}.download`);
let hasLoggedBinaryInfo = false;
let isDownloading = false;
let downloadPromise: Promise<void> | null = null;

function downloadBinary(url: string, dest: string, redirectCount = 0): Promise<void> {
  if (redirectCount > 5) {
    return Promise.reject(new Error("Too many redirects"));
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    file.on("error", (error) => {
      file.close();
      fs.unlink(dest, () => {
        reject(error);
      });
    });

    const request = https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        const location = response.headers.location;
        fs.unlink(dest, (err) => {
          if (err) {
            reject(err);
            return;
          }
          if (!location.startsWith("https://")) {
            reject(new Error(`Redirect to non-HTTPS URL is not allowed: ${location}`));
            return;
          }
          resolve(downloadBinary(location, dest, redirectCount + 1));
        });
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {
          reject(new Error(`Download failed with status ${response.statusCode}`));
        });
        return;
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close(() => resolve());
      });
    });

    request.on("error", (error) => {
      file.close();
      fs.unlink(dest, () => {
        reject(error);
      });
    });
  });
}

function verifyChecksum(filePath: string, expectedChecksum: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("error", (error) => reject(error));
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => {
      const actualChecksum = hash.digest("hex");
      if (actualChecksum.toLowerCase() === expectedChecksum.toLowerCase()) {
        resolve();
      } else {
        reject(new Error(`Checksum mismatch. Expected: ${expectedChecksum}, Got: ${actualChecksum}`));
      }
    });
  });
}

let hasVerifiedBinaryThisSession = false;

async function ensureBinary() {
  const binaryExists = fs.existsSync(binary);
  let shouldDownload = !binaryExists;

  if (binaryExists) {
    // Verify checksum at least once per session to catch corrupt binaries
    if (!hasVerifiedBinaryThisSession) {
      try {
        await verifyChecksum(binary, WINDOWS_BINARY_CHECKSUM);
        hasVerifiedBinaryThisSession = true;
      } catch (error) {
        console.warn("Binary checksum verification failed, downloading replacement...", error);
        shouldDownload = true;
      }
    }

    if (!shouldDownload) {
      await logBinaryInfo();
      return;
    }
  }

  if (isDownloading && downloadPromise) {
    return downloadPromise;
  }

  isDownloading = true;
  downloadPromise = (async () => {
    let downloadToast: Toast | undefined;

    try {
      if (!fs.existsSync(environment.supportPath)) {
        fs.mkdirSync(environment.supportPath, { recursive: true });
      }

      console.log("Downloading Windows audio CLI binary...");
      downloadToast = await showToast({
        style: Toast.Style.Animated,
        title: "Downloading Windows audio CLI",
        message: "Preparing audio device support...",
      });
      try {
        for (const file of fs.readdirSync(environment.supportPath)) {
          if (/^win-audio-cli\.\d+\.download$/.test(file)) {
            fs.unlinkSync(path.join(environment.supportPath, file));
          }
        }
      } catch {
        // Best-effort cleanup for temp files left by crashed processes.
      }
      await downloadBinary(WINDOWS_BINARY_URL, binaryDownload);
      await verifyChecksum(binaryDownload, WINDOWS_BINARY_CHECKSUM);
      fs.renameSync(binaryDownload, binary);
      hasVerifiedBinaryThisSession = true;
      console.log("Windows audio CLI binary downloaded and verified successfully");
      if (downloadToast) {
        downloadToast.style = Toast.Style.Success;
        downloadToast.title = "Windows audio CLI ready";
        downloadToast.message = "Audio device support was installed.";
      }
      await logBinaryInfo();
    } catch (error) {
      if (fs.existsSync(binaryDownload)) {
        fs.unlinkSync(binaryDownload);
      }
      if (downloadToast) {
        downloadToast.style = Toast.Style.Failure;
        downloadToast.title = "Failed to download Windows audio CLI";
        downloadToast.message = String(error);
      }
      throw error;
    } finally {
      isDownloading = false;
      downloadPromise = null;
    }
  })();

  return downloadPromise;
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

async function getWindowsVolume(type: "input" | "output", deviceId: string): Promise<number | undefined> {
  try {
    const result = await runBinary<WindowsAudioVolumeResult>([
      type === "output" ? "get-output-volume" : "get-input-volume",
      "--id",
      deviceId,
    ]);
    if (result.type !== type || String(result.device.id) !== String(deviceId)) {
      return undefined;
    }

    return Math.max(0, Math.min(100, result.volume)) / 100;
  } catch {
    return undefined;
  }
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

  async setOutputDeviceVolume(deviceId: string, volume: number) {
    const level = Math.round(Math.max(0, Math.min(1, volume)) * 100);
    await runBinary<WindowsAudioVolumeResult>(["set-output-volume", "--volume", `${level}`, "--id", deviceId]);
  },

  async getOutputDeviceVolume(deviceId: string) {
    return getWindowsVolume("output", deviceId);
  },

  async setInputDeviceVolume(deviceId: string, volume: number) {
    const level = Math.round(Math.max(0, Math.min(1, volume)) * 100);
    await runBinary<WindowsAudioVolumeResult>(["set-input-volume", "--volume", `${level}`, "--id", deviceId]);
  },

  async getInputDeviceVolume(deviceId: string) {
    return getWindowsVolume("input", deviceId);
  },
};
