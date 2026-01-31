import { execFile } from "child_process";
import { promisify } from "util";
import { AudioDevice, AudioProvider } from "./types";

const execFileAsync = promisify(execFile);

type DeviceType = "output" | "input";

export class MacOSAudioProvider implements AudioProvider {
  private async listDevices(type: DeviceType): Promise<AudioDevice[]> {
    const [listResult, currentResult] = await Promise.all([
      execFileAsync("SwitchAudioSource", ["-a", "-t", type], { encoding: "utf-8" }),
      execFileAsync("SwitchAudioSource", ["-c", "-t", type], { encoding: "utf-8" }),
    ]);

    const currentDevice = currentResult.stdout?.trim() ?? "";
    const deviceList = listResult.stdout?.trim() ?? "";
    if (!deviceList) return [];

    return deviceList
      .split("\n")
      .filter((line) => line.length > 0)
      .map((name) => ({
        id: name,
        name,
        isDefault: name === currentDevice,
        type,
      }));
  }

  async listOutputDevices(): Promise<AudioDevice[]> {
    return this.listDevices("output");
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    await execFileAsync("SwitchAudioSource", ["-t", "output", "-s", deviceId], { encoding: "utf-8" });
  }

  async listInputDevices(): Promise<AudioDevice[]> {
    return this.listDevices("input");
  }

  async setInputDevice(deviceId: string): Promise<void> {
    await execFileAsync("SwitchAudioSource", ["-t", "input", "-s", deviceId], { encoding: "utf-8" });
  }
}
