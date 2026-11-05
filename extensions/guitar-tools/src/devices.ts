import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);

export interface Device {
  name: string;
  channels: number;
  manufacturer: string;
}
type AudioItem = {
  _name?: string;
  _items?: AudioItem[];
  coreaudio_device_input?: number;
  coreaudio_device_manufacturer?: string;
};

export async function listInputs(): Promise<Device[]> {
  const { stdout } = await run("/usr/sbin/system_profiler", ["SPAudioDataType", "-json"], {
    timeout: 15000,
    maxBuffer: 1024 * 1024,
  });
  const json = JSON.parse(stdout) as { SPAudioDataType?: AudioItem[] };
  const devices: Device[] = [];
  const visit = (items: AudioItem[]) => {
    for (const item of items) {
      if (item._name && Number(item.coreaudio_device_input) > 0) {
        devices.push({
          name: item._name,
          channels: Number(item.coreaudio_device_input),
          manufacturer: item.coreaudio_device_manufacturer || "",
        });
      }
      if (item._items) visit(item._items);
    }
  };
  visit(json.SPAudioDataType || []);
  return devices;
}
