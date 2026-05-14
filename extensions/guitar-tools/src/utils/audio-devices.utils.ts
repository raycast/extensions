import { execSync } from "child_process";

export interface AudioDevice {
  name: string;
  type: string;
  channels: string;
  manufacturer: string;
}

export function getAudioInputDevices(): AudioDevice[] {
  const output = execSync("/usr/sbin/system_profiler SPAudioDataType").toString();

  const deviceList: AudioDevice[] = [];
  const lines = output.split("\n");

  let currentDevice: Partial<AudioDevice> = {};
  let deviceName = "";

  for (const line of lines) {
    if (line.match(/^ {8}\S.*:$/)) {
      if (currentDevice.channels && deviceName) {
        deviceList.push({
          name: deviceName,
          type: currentDevice.type || "Unknown",
          channels: currentDevice.channels,
          manufacturer: currentDevice.manufacturer || "Unknown",
        });
      }

      deviceName = line.trim().replace(":", "");
      currentDevice = {};
    }

    if (line.includes("Input Channels:")) {
      currentDevice.channels = line.split(":")[1].trim();
    }
    if (line.includes("Manufacturer:")) {
      currentDevice.manufacturer = line.split(":")[1].trim();
    }
    if (line.includes("Transport:")) {
      currentDevice.type = line.split(":")[1].trim();
    }
  }

  if (currentDevice.channels && deviceName) {
    deviceList.push({
      name: deviceName,
      type: currentDevice.type || "Unknown",
      channels: currentDevice.channels,
      manufacturer: currentDevice.manufacturer || "Unknown",
    });
  }

  return deviceList;
}
