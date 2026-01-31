import { execFile } from "child_process";
import { promisify } from "util";
import { AudioDevice, AudioProvider, DeviceType } from "./types";

const execFileAsync = promisify(execFile);

interface PowerShellDevice {
  ID: string;
  Name: string;
  Default: boolean;
}

type PowerShellDeviceType = "Playback" | "Recording";

export class WindowsAudioProvider implements AudioProvider {
  private async listDevices(type: PowerShellDeviceType): Promise<AudioDevice[]> {
    const audioType: DeviceType = type === "Playback" ? "output" : "input";
    const script = `Get-AudioDevice -List | Where-Object { $_.Type -eq '${type}' } | Select-Object ID, Name, Default | ConvertTo-Json -Compress`;

    const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", script], {
      encoding: "utf-8",
    });

    const output = stdout.trim();
    if (!output) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(output);
    } catch {
      throw new Error(`Failed to parse audio device list: ${output.slice(0, 100)}`);
    }

    const devices: PowerShellDevice[] = Array.isArray(parsed) ? parsed : [parsed as PowerShellDevice];

    return devices.map((d) => ({
      id: d.ID,
      name: d.Name,
      isDefault: d.Default,
      type: audioType,
    }));
  }

  private async setDevice(deviceId: string): Promise<void> {
    const script = `Set-AudioDevice -ID '${deviceId}'`;
    await execFileAsync("powershell", ["-NoProfile", "-Command", script], {
      encoding: "utf-8",
    });
  }

  async listOutputDevices(): Promise<AudioDevice[]> {
    return this.listDevices("Playback");
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    return this.setDevice(deviceId);
  }

  async listInputDevices(): Promise<AudioDevice[]> {
    return this.listDevices("Recording");
  }

  async setInputDevice(deviceId: string): Promise<void> {
    return this.setDevice(deviceId);
  }
}
