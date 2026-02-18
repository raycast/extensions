import path from "path";
import fs from "fs";
import https from "https";
import crypto from "crypto";
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

const WINDOWS_BINARY_URL = "https://github.com/Inovvia/go-win-audio-cli/releases/download/1.1.0/win-audio-cli.exe";
const WINDOWS_BINARY_CHECKSUM = "569fe05624f410b565b92fa0c729e29f170bb78907dcff7ef2cf66a01465e365";

const binary = path.join(environment.supportPath, "win-audio-cli.exe");
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
  if (fs.existsSync(binary)) {
    // Verify checksum at least once per session to catch corrupt binaries
    if (!hasVerifiedBinaryThisSession) {
      try {
        await verifyChecksum(binary, WINDOWS_BINARY_CHECKSUM);
        hasVerifiedBinaryThisSession = true;
      } catch (error) {
        console.warn("Binary checksum verification failed, re-downloading...", error);
        fs.unlinkSync(binary);
        // Continue to download below
      }
    }

    if (fs.existsSync(binary)) {
      await logBinaryInfo();
      return;
    }
  }

  if (isDownloading && downloadPromise) {
    return downloadPromise;
  }

  isDownloading = true;
  downloadPromise = (async () => {
    try {
      if (!fs.existsSync(environment.supportPath)) {
        fs.mkdirSync(environment.supportPath, { recursive: true });
      }

      console.log("Downloading Windows audio CLI binary...");
      await downloadBinary(WINDOWS_BINARY_URL, binary);
      await verifyChecksum(binary, WINDOWS_BINARY_CHECKSUM);
      hasVerifiedBinaryThisSession = true;
      console.log("Windows audio CLI binary downloaded and verified successfully");
      await logBinaryInfo();
    } catch (error) {
      if (fs.existsSync(binary)) {
        fs.unlinkSync(binary);
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
